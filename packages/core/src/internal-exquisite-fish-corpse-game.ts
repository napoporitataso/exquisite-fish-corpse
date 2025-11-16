import {
  assertPresent,
  assertSentenceCompletion,
  assertSnippetOwnership,
  normalisePositiveInteger,
  normaliseProbability,
  pickDirection,
  pickFirstCharacters,
  pickFirstTokens,
  pickLastCharacters,
  pickLastTokens,
  pickPreviewContent,
} from './internal-helpers.js';
import { randomUUID } from './utils/random';

import type {
  CompletedSentence,
  CompletedSentences,
  ExquisiteCorpseProgress,
  NextChallenge,
  SerializedSentenceState,
  SerializedSingleExquisiteCorpseState,
  SingleExquisiteCorpseOptions,
  Snippet,
  SnippetLinkDirection,
  SnippetPosition,
  Token,
} from './types.js';

type InternalSnippet = Snippet & {
  sentenceId: string;
};

type SentenceState = {
  id: string;
  headId: string;
  tailId: string;
  hasBeginning: boolean;
  hasEnd: boolean;
};

type Direction = SnippetLinkDirection;

type InternalSingleExquisiteCorpseDependencies = {
  /**
   * 乱数を返す関数
   */
  random(): number;
  /**
   * 与えられた文字列をトークン列に変換する
   */
  tokenize(content: string): Token[];
};

const DEFAULT_MAX_TOKENS = 3;
const DEFAULT_MAX_CHARS = 10;
const DEFAULT_BEGINNING_PROBABILITY = 0.3;
const DEFAULT_ENDING_PROBABILITY = 0.3;
const DEFAULT_SENTENCE_ENDING_PUNCTUATIONS = ['。', '！', '？', '.', '!', '?'];

/**
 * 依存性注入可能な内部用クラス
 * テストではこのクラスを直接利用する
 */
export class InternalExquisiteFishCorpseGame {
  /** 次のプレイヤーに提示する断片の最大トークン数 */
  private readonly maxTokensForNextPlayer: number;

  /** 次のプレイヤーに提示する断片の最大文字数 */
  private readonly maxCharsForNextPlayer: number;

  /** 始端断片として扱う確率 */
  private readonly beginningSnippetProbability: number;

  /** 終端断片として扱う確率 */
  private readonly endingSnippetProbability: number;

  /** 文末句読点のリスト */
  private readonly sentenceEndingPunctuations?: string[];

  /** 断片IDから断片を取得できるマップ */
  private readonly snippets = new Map<string, InternalSnippet>();

  /** 文IDから文の状態を取得できるマップ */
  private readonly sentences = new Map<string, SentenceState>();

  /** 開放されている前方の断片IDの集合 */
  private readonly openPrecedingSnippetIds = new Set<string>();

  /** 開放されている後方の断片IDの集合 */
  private readonly openFollowingSnippetIds = new Set<string>();

  /** 最後にユーザーに提示した断片ID */
  private lastServedSnippetId: string | null = null;

  /**
   * ユーザーが最後に追加した断片ID
   * 同じ断片を連続提示しないための抑制に利用する
   */
  private lastCreatedSnippetId: string | null = null;

  /** 最後に提示したチャレンジ情報 */
  private lastServedChallenge: { snippetId: string; direction: Direction } | null = null;

  private readonly random: () => number;

  private readonly tokenizeContent: (content: string) => Token[];

  constructor(options: SingleExquisiteCorpseOptions, dependencies: InternalSingleExquisiteCorpseDependencies) {
    const {
      maxTokensForNextPlayer = DEFAULT_MAX_TOKENS,
      maxCharsForNextPlayer = DEFAULT_MAX_CHARS,
      beginningSnippetProbability = DEFAULT_BEGINNING_PROBABILITY,
      endingSnippetProbability = DEFAULT_ENDING_PROBABILITY,
      sentenceEndingPunctuations = DEFAULT_SENTENCE_ENDING_PUNCTUATIONS,
    } = options;

    // TODO バリデーションする

    this.maxTokensForNextPlayer = normalisePositiveInteger(maxTokensForNextPlayer, DEFAULT_MAX_TOKENS);
    this.maxCharsForNextPlayer = normalisePositiveInteger(maxCharsForNextPlayer, DEFAULT_MAX_CHARS);
    this.beginningSnippetProbability = normaliseProbability(beginningSnippetProbability, DEFAULT_BEGINNING_PROBABILITY);
    this.endingSnippetProbability = normaliseProbability(endingSnippetProbability, DEFAULT_ENDING_PROBABILITY);

    if (sentenceEndingPunctuations) {
      const filtered = sentenceEndingPunctuations.filter((punctuation) => punctuation.trim().length > 0);
      this.sentenceEndingPunctuations = filtered.length > 0 ? filtered : undefined;
    }

    this.random = dependencies.random;
    this.tokenizeContent = dependencies.tokenize;
  }

  /**
   * 
優美な屍骸が完成しているかどうか
   */
  get completed(): boolean {
    if (this.sentences.size === 0) {
      return false;
    }
    for (const sentence of this.sentences.values()) {
      if (!this.isSentenceCompleted(sentence)) {
        return false;
      }
    }
    return true;
  }

  /**
   * 任意の位置に断片を追加する
   * ゲーム開始時にのみ使用される想定
   * @param position 断片の位置（文頭・文中・文末）
   * @param content 断片の内容
   * @return 追加された断片
   */
  addSnippet(position: SnippetPosition, content: string): Snippet {
    this.lastServedChallenge = null;
    const normalisedContent = this.ensureContent(content);
    const tokens = this.runTokenizer(normalisedContent);
    const id = randomUUID();
    const sentenceId = randomUUID();
    const snippet: InternalSnippet = {
      id,
      content: normalisedContent,
      position,
      tokens,
      previousSnippetId: null,
      nextSnippetId: null,
      sentenceId,
    };

    this.snippets.set(id, snippet);
    this.sentences.set(sentenceId, {
      id: sentenceId,
      headId: id,
      tailId: id,
      hasBeginning: position === 'BEGINNING',
      hasEnd: position === 'END',
    });
    this.refreshOpenness(snippet);
    // 新しい断片を追加したことを記録し、次回提示候補から優先的に除外する
    this.lastCreatedSnippetId = snippet.id;

    return this.cloneSnippet(snippet);
  }

  /**
   * 指定した断片の後方に断片を連結する
   * @param targetSnippetId 連結対象の断片ID
   * @param content 追加する断片の内容
   * @return 追加された断片
   */
  addFollowingSnippet(targetSnippetId: string, content: string): Snippet {
    this.validateChallengeResponse(targetSnippetId, 'FOLLOWING');
    const normalisedContent = this.ensureContent(content);
    const previousSnippet = this.getSnippetOrThrow(targetSnippetId);
    if (previousSnippet.nextSnippetId) {
      throw new Error('この断片にはすでに続きが存在します。');
    }
    if (previousSnippet.position === 'END') {
      throw new Error('終端の断片には続きの断片を追加できません。');
    }

    // チェーン取得
    const sentence = this.getSentenceOrThrow(previousSnippet.sentenceId);

    // 終端判定
    const endsWithPunctuation = this.endsWithSentencePunctuation(normalisedContent);
    const shouldBecomeEnding = endsWithPunctuation || this.shouldBecomeEnding();
    const position: SnippetPosition = shouldBecomeEnding ? 'END' : 'MIDDLE';

    const tokens = this.runTokenizer(normalisedContent);
    const nextId = randomUUID();
    const snippet: InternalSnippet = {
      id: nextId,
      content: normalisedContent,
      position,
      tokens,
      previousSnippetId: previousSnippet.id,
      nextSnippetId: null,
      sentenceId: sentence.id,
    };
    previousSnippet.nextSnippetId = nextId;
    this.refreshOpenness(previousSnippet);

    this.snippets.set(nextId, snippet);

    if (sentence.tailId === previousSnippet.id) {
      sentence.tailId = nextId;
    }

    if (position === 'END') {
      sentence.hasEnd = true;
    }

    this.refreshOpenness(snippet);
    // 直前に追加した断片は次のターンで再提示しないよう記録
    this.lastCreatedSnippetId = snippet.id;

    return this.cloneSnippet(snippet);
  }

  /**
   * 指定した断片の前方に断片を連結する
   * @param targetSnippetId 連結対象の断片ID
   * @param content 追加する断片の内容
   * @return 追加された断片
   */
  addPrecedingSnippet(targetSnippetId: string, content: string): Snippet {
    this.validateChallengeResponse(targetSnippetId, 'PRECEDING');
    const normalisedContent = this.ensureContent(content);
    const nextSnippet = this.getSnippetOrThrow(targetSnippetId);
    if (nextSnippet.previousSnippetId) {
      throw new Error('この断片にはすでに前段があります。');
    }
    if (nextSnippet.position === 'BEGINNING') {
      throw new Error('文頭の断片には前段を追加できません。');
    }

    const sentence = this.getSentenceOrThrow(nextSnippet.sentenceId);
    const tokens = this.runTokenizer(normalisedContent);
    const newId = randomUUID();
    const shouldBecomeBeginning = this.shouldBecomeBeginning();
    const position: SnippetPosition = shouldBecomeBeginning ? 'BEGINNING' : 'MIDDLE';
    const snippet: InternalSnippet = {
      id: newId,
      content: normalisedContent,
      position,
      tokens,
      previousSnippetId: null,
      nextSnippetId: nextSnippet.id,
      sentenceId: sentence.id,
    };

    nextSnippet.previousSnippetId = newId;
    this.refreshOpenness(nextSnippet);

    this.snippets.set(newId, snippet);
    if (sentence.headId === nextSnippet.id) {
      sentence.headId = newId;
    }
    if (position === 'BEGINNING') {
      sentence.hasBeginning = true;
    }

    this.refreshOpenness(snippet);
    // 直前に追加した断片は次のチャレンジ候補から極力外す
    this.lastCreatedSnippetId = snippet.id;

    return this.cloneSnippet(snippet);
  }

  /**
   * 次のプレイヤーに提示する断片を取得する
   */
  getNextChallenge(): NextChallenge | null {
    // 候補となる断片IDを収集
    const candidateIds = this.collectCandidateSnippetIds();
    if (candidateIds.length === 0) {
      this.lastServedChallenge = null;
      return null;
    }

    const poolAfterServed = this.excludeLastServed(candidateIds);
    const pool = this.excludeLastCreated(poolAfterServed);

    const viableCandidates = [];
    for (const id of pool) {
      const snippet = this.getSnippetOrThrow(id);
      const canAddPreceding = this.canAddPreceding(snippet);
      const canAddFollowing = this.canAddFollowing(snippet);
      viableCandidates.push({ snippet, canAddPreceding, canAddFollowing });
    }

    const chosen = viableCandidates[Math.floor(this.random() * viableCandidates.length)]!;
    const allowedDirection = pickDirection(chosen.canAddPreceding, chosen.canAddFollowing, this.random);

    // ユーザーに提示する断片の一部を構築
    const contentPart =
      allowedDirection === 'PRECEDING'
        ? this.buildLeadingContentPart(chosen.snippet)
        : this.buildTrailingContentPart(chosen.snippet);
    const result = {
      id: chosen.snippet.id,
      contentPart,
      direction: allowedDirection,
    };
    this.lastServedSnippetId = chosen.snippet.id;
    this.lastServedChallenge = { snippetId: chosen.snippet.id, direction: allowedDirection };
    return result;
  }

  /**
   * IDから断片を取得する
   */
  getSnippetById(snippetId: string): Snippet | null {
    const snippet = this.snippets.get(snippetId);
    if (!snippet) {
      return null;
    }
    return this.cloneSnippet(snippet);
  }

  /**
   * 完成した文章を取得する
   */
  getCompletedSentences(): CompletedSentences {
    if (!this.completed) {
      throw new Error('文章が完成していません。');
    }
    const sentences = [...this.sentences.values()].map((sentence) => this.buildCompletedSentence(sentence));
    return { sentences };
  }

  /**
   * 接続の進捗を取得する
   */
  getProgress(): ExquisiteCorpseProgress {
    let openArms = 0;
    let totalArms = 0;

    for (const snippet of this.snippets.values()) {
      if (snippet.position !== 'BEGINNING') {
        totalArms += 1;
        if (!snippet.previousSnippetId) {
          openArms += 1;
        }
      }
      if (snippet.position !== 'END') {
        totalArms += 1;
        if (!snippet.nextSnippetId) {
          openArms += 1;
        }
      }
    }

    return { openArms, totalArms };
  }

  /**
   * 現在の状態をシリアライズする
   */
  serialize(): SerializedSingleExquisiteCorpseState {
    const serializedSnippets = [...this.snippets.values()].map((snippet) => this.cloneSnippet(snippet));
    const serializedSentences = [...this.sentences.values()].map((sentence) => this.serializeSentence(sentence));

    return {
      completed: this.completed,
      snippets: serializedSnippets,
      sentences: serializedSentences,
      openPrecedingSnippetIds: [...this.openPrecedingSnippetIds],
      openFollowingSnippetIds: [...this.openFollowingSnippetIds],
      lastServedSnippetId: this.lastServedSnippetId,
    };
  }

  /**
   * シリアライズ済みの状態から復元する
   * @param state 保存済みの状態
   */
  restoreFromSerializedState(state: SerializedSingleExquisiteCorpseState): void {
    this.clearInternalState();

    const ownership = this.buildSnippetSentenceOwnership(state.sentences);
    for (const snippetData of state.snippets) {
      const sentenceId = ownership.get(snippetData.id);
      if (!sentenceId) {
        throw new Error(`断片(ID: ${snippetData.id})に対応する文が見つかりません。`);
      }

      const snippet: InternalSnippet = {
        id: snippetData.id,
        content: this.ensureContent(snippetData.content),
        position: snippetData.position,
        tokens: this.sanitizeTokens(snippetData.tokens),
        previousSnippetId: snippetData.previousSnippetId,
        nextSnippetId: snippetData.nextSnippetId,
        sentenceId,
      };
      this.snippets.set(snippet.id, snippet);
    }

    for (const sentence of state.sentences) {
      this.validateSentenceStructure(sentence);
      this.sentences.set(sentence.id, {
        id: sentence.id,
        headId: sentence.headId,
        tailId: sentence.tailId,
        hasBeginning: sentence.hasBeginning,
        hasEnd: sentence.hasEnd,
      });
    }

    this.rebuildOpenSnippetSets(state);
    this.lastServedSnippetId = this.validateLastServedSnippetId(state.lastServedSnippetId);

    if (state.completed !== this.completed) {
      throw new Error('完成状態が保存時と一致しません。');
    }
  }

  /**
   * 文字列が終端句読点で終わるかを判定する
   */
  private endsWithSentencePunctuation(content: string): boolean {
    if (!this.sentenceEndingPunctuations) {
      return false;
    }
    const trimmed = content.trim();
    return this.sentenceEndingPunctuations.some((punctuation) => trimmed.endsWith(punctuation));
  }

  /**
   * 開いている断片IDを収集する
   */
  private collectCandidateSnippetIds(): string[] {
    const ids = new Set<string>();

    for (const id of this.openPrecedingSnippetIds) {
      const snippet = this.getSnippetOrThrow(id);
      const sentence = this.getSentenceOrThrow(snippet.sentenceId);
      if (!this.isSentenceCompleted(sentence)) {
        ids.add(id);
      }
    }

    for (const id of this.openFollowingSnippetIds) {
      const snippet = this.getSnippetOrThrow(id);
      const sentence = this.getSentenceOrThrow(snippet.sentenceId);
      if (!this.isSentenceCompleted(sentence)) {
        ids.add(id);
      }
    }

    return [...ids];
  }

  /**
   * 文頭方向に連結可能かを判定する
   */
  private canAddPreceding(snippet: InternalSnippet): boolean {
    return !snippet.previousSnippetId && snippet.position !== 'BEGINNING';
  }

  /**
   * 文末方向に連結可能かを判定する
   */
  private canAddFollowing(snippet: InternalSnippet): boolean {
    return !snippet.nextSnippetId && snippet.position !== 'END';
  }

  /**
   * 提示済みチャレンジへの応答が正しい方向か検証する
   */
  private validateChallengeResponse(snippetId: string, direction: Direction): void {
    if (!this.lastServedChallenge) {
      return;
    }
    if (this.lastServedChallenge.snippetId !== snippetId) {
      return;
    }
    if (this.lastServedChallenge.direction !== direction) {
      throw new Error('提示された方向と異なる操作です。');
    }
    this.lastServedChallenge = null;
  }

  /**
   * 文の状態を取得する
   */
  private getSentenceOrThrow(sentenceId: string): SentenceState {
    return assertPresent(this.sentences.get(sentenceId), '文の管理情報が存在しません。');
  }

  /**
   * IDから断片を取得する
   */
  private getSnippetOrThrow(snippetId: string): InternalSnippet {
    return assertPresent(this.snippets.get(snippetId), `指定された断片(ID: ${snippetId})は存在しません。`);
  }

  /**
   * コンテンツを検証する
   */
  private ensureContent(content: string): string {
    if (typeof content !== 'string') {
      throw new Error('断片の内容は文字列である必要があります。');
    }
    const trimmed = content.trim();
    if (!trimmed) {
      throw new Error('空の断片は追加できません。');
    }
    return trimmed;
  }

  /**
   * 断片の開放状態を更新する
   */
  private refreshOpenness(snippet: InternalSnippet): void {
    // 前の断片が無い、かつ中間位置なら前方を開放
    if (!snippet.previousSnippetId && snippet.position !== 'BEGINNING') {
      this.openPrecedingSnippetIds.add(snippet.id);
    } else {
      this.openPrecedingSnippetIds.delete(snippet.id);
    }

    // 次の断片が無い、かつ終端位置でなければ後方を開放
    if (!snippet.nextSnippetId && snippet.position !== 'END') {
      this.openFollowingSnippetIds.add(snippet.id);
    } else {
      this.openFollowingSnippetIds.delete(snippet.id);
    }
  }

  /**
   * 始端になるかを判定する
   */
  private shouldBecomeBeginning(): boolean {
    return this.random() < this.beginningSnippetProbability;
  }

  /**
   * 終端になるかを判定する
   */
  private shouldBecomeEnding(): boolean {
    return this.random() < this.endingSnippetProbability;
  }

  /**
   * 文が完成しているかを判定する
   */
  private isSentenceCompleted(sentence: SentenceState): boolean {
    return sentence.hasBeginning && sentence.hasEnd;
  }

  /**
   * トークナイザを実行する
   */
  private runTokenizer(content: string): Token[] {
    const tokens = this.tokenizeContent(content);
    return this.sanitizeTokens(tokens);
  }

  /**
   * 手前方向に提示する内容を構築する
   */
  private buildLeadingContentPart(snippet: InternalSnippet): string {
    const tokensPart = pickFirstTokens(snippet.tokens, this.maxTokensForNextPlayer);
    const charsPart = pickFirstCharacters(snippet.content, this.maxCharsForNextPlayer);
    return pickPreviewContent(tokensPart, charsPart);
  }

  /**
   * 後方方向に提示する内容を構築する
   */
  private buildTrailingContentPart(snippet: InternalSnippet): string {
    const tokensPart = pickLastTokens(snippet.tokens, this.maxTokensForNextPlayer);
    const charsPart = pickLastCharacters(snippet.content, this.maxCharsForNextPlayer);
    return pickPreviewContent(tokensPart, charsPart);
  }

  /**
   * 公開用に断片を複製する
   */
  private cloneSnippet(snippet: InternalSnippet): Snippet {
    return {
      id: snippet.id,
      content: snippet.content,
      position: snippet.position,
      tokens: snippet.tokens.map((token) => ({ ...token })),
      previousSnippetId: snippet.previousSnippetId,
      nextSnippetId: snippet.nextSnippetId,
    };
  }

  /**
   * 直前に提示した断片を候補から除外する
   * @param candidates 候補ID一覧
   * @returns 除外後の候補（除外できない場合はそのまま返す）
   */
  private excludeLastServed(candidates: string[]): string[] {
    const lastServedId = this.lastServedSnippetId;
    if (!lastServedId) {
      return candidates;
    }
    const filtered = candidates.filter((id) => id !== lastServedId);
    if (filtered.length === 0) {
      console.log('[ExquisiteFishCorpseGame] fallback: no candidates except lastServedSnippetId');
      return candidates;
    }
    return filtered;
  }

  /**
   * 直前にユーザーが作成した断片を候補から除外する
   * @param candidates 候補ID一覧
   * @returns 除外後の候補（除外できない場合はそのまま返す）
   */
  private excludeLastCreated(candidates: string[]): string[] {
    if (!this.lastCreatedSnippetId) {
      return candidates;
    }
    const filtered = candidates.filter((id) => id !== this.lastCreatedSnippetId);
    if (filtered.length === 0) {
      console.log('[ExquisiteFishCorpseGame] fallback: no candidates except lastCreatedSnippetId');
      return candidates;
    }
    return filtered;
  }

  /**
   * 文の状態をシリアライズする
   */
  private serializeSentence(sentence: SentenceState): SerializedSentenceState {
    return {
      id: sentence.id,
      headId: sentence.headId,
      tailId: sentence.tailId,
      hasBeginning: sentence.hasBeginning,
      hasEnd: sentence.hasEnd,
      snippetIds: this.collectSentenceSnippetIds(sentence),
    };
  }

  /**
   * 文を構成する断片IDを先頭から順番に収集する
   */
  private collectSentenceSnippetIds(sentence: SentenceState): string[] {
    const ids: string[] = [];
    let currentId: string | null = sentence.headId;

    while (currentId) {
      ids.push(currentId);
      const snippet = this.getSnippetOrThrow(currentId);
      currentId = snippet.nextSnippetId;
    }

    return ids;
  }

  /**
   * 完成した文を構築する
   */
  private buildCompletedSentence(sentence: SentenceState): CompletedSentence {
    assertSentenceCompletion(sentence.hasBeginning, sentence.hasEnd);
    const snippetIds = this.collectSentenceSnippetIds(sentence);
    const snippets = snippetIds.map((id) => this.cloneSnippet(this.getSnippetOrThrow(id)));
    const text = snippets.map((snippet) => snippet.content).join('');
    return {
      id: sentence.id,
      snippets,
      text,
    };
  }

  /**
   * 現在の内部状態を完全に初期化する
   */
  private clearInternalState(): void {
    this.snippets.clear();
    this.sentences.clear();
    this.openPrecedingSnippetIds.clear();
    this.openFollowingSnippetIds.clear();
    this.lastServedSnippetId = null;
    this.lastServedChallenge = null;
    this.lastCreatedSnippetId = null;
  }

  /**
   * シリアライズ済みチェーンから断片の所属情報を構築する
   */
  private buildSnippetSentenceOwnership(sentences: SerializedSentenceState[]): Map<string, string> {
    const ownership = new Map<string, string>();

    for (const sentence of sentences) {
      for (const snippetId of sentence.snippetIds) {
        if (ownership.has(snippetId)) {
          throw new Error(`断片(ID: ${snippetId})が複数の文に属しています。`);
        }
        ownership.set(snippetId, sentence.id);
      }
    }

    return ownership;
  }

  /**
   * チェーン定義が内部の断片と整合しているか確認する
   */
  private validateSentenceStructure(sentence: SerializedSentenceState): void {
    if (sentence.snippetIds.length === 0) {
      throw new Error(`文(ID: ${sentence.id})に断片が含まれていません。`);
    }
    if (sentence.snippetIds[0] !== sentence.headId) {
      throw new Error(`文(ID: ${sentence.id})の先頭IDが不正です。`);
    }
    if (sentence.snippetIds[sentence.snippetIds.length - 1] !== sentence.tailId) {
      throw new Error(`文(ID: ${sentence.id})の末尾IDが不正です。`);
    }

    for (let index = 0; index < sentence.snippetIds.length; index += 1) {
      const snippetId = sentence.snippetIds[index]!;
      const snippet = this.snippets.get(snippetId);
      if (!snippet) {
        throw new Error(`文(ID: ${sentence.id})に存在しない断片(ID: ${snippetId})が含まれています。`);
      }
      assertSnippetOwnership(snippet.sentenceId, sentence.id, snippetId);
      if (index === 0 && snippet.previousSnippetId !== null) {
        throw new Error(`文(ID: ${sentence.id})の先頭断片(ID: ${snippetId})に前段が存在します。`);
      }
      if (index === sentence.snippetIds.length - 1 && snippet.nextSnippetId !== null) {
        throw new Error(`文(ID: ${sentence.id})の末尾断片(ID: ${snippetId})に続きがあります。`);
      }
      if (index < sentence.snippetIds.length - 1) {
        const nextId = sentence.snippetIds[index + 1]!;
        if (snippet.nextSnippetId !== nextId) {
          throw new Error(`文(ID: ${sentence.id})の連結順序が不正です。`);
        }
        const nextSnippet = this.snippets.get(nextId);
        if (!nextSnippet || nextSnippet.previousSnippetId !== snippet.id) {
          throw new Error(`文(ID: ${sentence.id})の逆連結順序が不正です。`);
        }
      }
    }
  }

  /**
   * 保存されている開放状態と現在の状態を突き合わせる
   */
  private rebuildOpenSnippetSets(state: SerializedSingleExquisiteCorpseState): void {
    for (const snippet of this.snippets.values()) {
      this.refreshOpenness(snippet);
    }

    this.assertSetEquality(this.openPrecedingSnippetIds, state.openPrecedingSnippetIds, '前方開放断片の情報が不正です。');
    this.assertSetEquality(this.openFollowingSnippetIds, state.openFollowingSnippetIds, '後方開放断片の情報が不正です。');

    this.openPrecedingSnippetIds.clear();
    for (const id of state.openPrecedingSnippetIds) {
      this.openPrecedingSnippetIds.add(id);
    }

    this.openFollowingSnippetIds.clear();
    for (const id of state.openFollowingSnippetIds) {
      this.openFollowingSnippetIds.add(id);
    }
  }

  /**
   * Setと配列の要素が一致するか検証する
   */
  private assertSetEquality(actual: Set<string>, expectedOrder: string[], message: string): void {
    const expected = new Set(expectedOrder);
    if (expected.size !== expectedOrder.length) {
      throw new Error(`${message} (重複を検出)`);
    }
    if (actual.size !== expected.size) {
      throw new Error(message);
    }
    for (const id of actual) {
      if (!expected.has(id)) {
        throw new Error(message);
      }
    }
  }

  /**
   * 最後に提示した断片IDを検証する
   */
  private validateLastServedSnippetId(snippetId: string | null): string | null {
    if (snippetId === null) {
      return null;
    }
    if (!this.snippets.has(snippetId)) {
      throw new Error('最後に提示した断片IDが存在しません。');
    }
    return snippetId;
  }

  /**
   * トークン配列の妥当性を確認しつつクローンする
   */
  private sanitizeTokens(tokens: Token[]): Token[] {
    if (!Array.isArray(tokens)) {
      throw new Error('トークナイザはトークン配列を返す必要があります。');
    }
    if (tokens.length === 0) {
      throw new Error('空のトークン配列は使用できません。');
    }
    return tokens.map((token) => {
      if (!token || typeof token.surface !== 'string') {
        throw new Error('トークンの形式が不正です。');
      }
      const surface = token.surface.trim();
      if (!surface) {
        throw new Error('空のトークンは許可されていません。');
      }
      return { surface };
    });
  }
}
