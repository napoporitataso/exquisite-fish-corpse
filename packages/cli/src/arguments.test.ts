import { getFlag, getFlags, hasFlag, parseArguments } from './arguments.js';

describe('parseArguments', () => {
  test('サブコマンドと型付きオプションを解析する', () => {
    const arguments_ = parseArguments(['new', '--state=game.json', '--json']);

    expect(arguments_.command).toBe('new');
    expect(getFlag(arguments_, 'state')).toBe('game.json');
    expect(hasFlag(arguments_, 'json')).toBe(true);
  });

  test('同じ文字列オプションの複数指定を保持する', () => {
    const arguments_ = parseArguments(['new', '--middle', 'ひとつ', '--middle', 'ふたつ']);

    expect(getFlags(arguments_, 'middle')).toEqual(['ひとつ', 'ふたつ']);
  });

  test('未知のオプションを拒否する', () => {
    expect(() => parseArguments(['new', '--unknown'])).toThrow('Unknown option');
  });

  test('余分な位置引数を拒否する', () => {
    expect(() => parseArguments(['new', 'extra'])).toThrow('不明な引数');
  });
});
