import React, { createContext, useEffect, useMemo, useState } from 'react';

export type ColorMode = 'light' | 'dark';
export type ColorModePreference = ColorMode | 'system';

export type ColorModeState = {
  /** ユーザーが選んだモード */
  mode: ColorModePreference;
  /** 実際に適用されているモード */
  resolvedMode: ColorMode;
};

export type ColorModeOptions = {
  /**
   * localStorage のキー
   * @default 'color-mode'
   */
  storageKey: string;
  /**
   * デフォルトのモード
   * @default 'system'
   */
  defaultMode: ColorModePreference;
  /**
   * DOM への適用方法
   * - "class": class 名を付け外しする
   * - "data-theme": data-theme 属性を切り替える
   * @default 'class'
   */
  attribute: 'class' | 'data-theme';
  /**
   * attribute === "class" のときのクラス名
   */
  darkClassName: string;
  lightClassName: string;
};

export type ColorModeContextValue = ColorModeState & {
  /** mode を直接指定 */
  setMode: (mode: ColorModePreference) => void;
  /** light / dark をトグル（system のときは system を維持しつつ resolved をトグル） */
  toggleMode: () => void;
  /** 今 dark かどうか */
  isDark: boolean;
};

export const ColorModeContext = createContext<ColorModeContextValue | null>(null);

/**
 * システムのカラーモード設定を取得
 * @returns
 */
const getSystemPrefersDark = (): boolean => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

/**
 * モードを解決
 * @param mode
 * @returns
 */
const resolveMode = (mode: ColorModePreference): ColorMode => {
  if (mode === 'system') {
    return getSystemPrefersDark() ? 'dark' : 'light';
  }
  return mode;
};

/**
 * 指定したモードを DOM に適用する
 * @param mode
 * @param param1
 */
const applyModeToDOM = (
  mode: ColorMode,
  { attribute, darkClassName, lightClassName }: Pick<ColorModeOptions, 'attribute' | 'darkClassName' | 'lightClassName'>,
) => {
  const root = document.documentElement;

  // class モードの場合はクラスを付け外し
  if (attribute === 'class') {
    root.classList.remove(darkClassName, lightClassName);
    root.classList.add(mode === 'dark' ? darkClassName : lightClassName);
  }
  // data-theme モードの場合は data-theme 属性を切り替え
  else if (attribute === 'data-theme') {
    root.setAttribute('data-theme', mode);
  }
};

/**
 * 初期状態を取得
 * @param options
 * @returns
 */
const getInitialState = (options?: ColorModeOptions): ColorModeState => {
  const storageKey = options?.storageKey ?? 'color-mode';
  const defaultMode = options?.defaultMode ?? 'system';
  const raw = window.localStorage.getItem(storageKey) as ColorModePreference | null;
  const mode: ColorModePreference = raw ?? defaultMode;
  const resolvedMode = resolveMode(mode);
  return { mode, resolvedMode };
};

type ProviderProps = {
  children: React.ReactNode;
  options?: ColorModeOptions;
};

export const ColorModeProvider: React.FC<ProviderProps> = ({
  children,
  options = { storageKey: 'color-mode', defaultMode: 'system', attribute: 'class', darkClassName: 'dark', lightClassName: 'light' },
}) => {
  const [state, setState] = useState<ColorModeState>(() => getInitialState(options));
  const storageKey = options.storageKey;

  // DOM への反映
  useEffect(() => {
    applyModeToDOM(state.resolvedMode, options);
  }, [state.resolvedMode, options]);

  // system モード時に prefers-color-scheme 変更を拾う
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const handler = (event: MediaQueryListEvent) => {
      setState((prev) => {
        if (prev.mode !== 'system') return prev;
        return {
          ...prev,
          resolvedMode: event.matches ? 'dark' : 'light',
        };
      });
    };

    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  // localStorage 経由で他タブの変更を同期
  useEffect(() => {
    const onStorage = ({ key, newValue }: StorageEvent) => {
      if (key !== storageKey) {
        return;
      }
      setState(() => {
        const nextMode = (newValue as ColorModePreference | null) ?? 'system';
        return {
          mode: nextMode,
          resolvedMode: resolveMode(nextMode),
        };
      });
    };
    window.addEventListener('storage', onStorage);

    return () => window.removeEventListener('storage', onStorage);
  }, [storageKey]);

  /**
   * 指定したモードに切り替え
   * @param mode
   */
  const setMode = (mode: ColorModePreference) => {
    setState({
      mode,
      resolvedMode: resolveMode(mode),
    });
    window.localStorage.setItem(storageKey, mode);
  };

  /**
   * dark / light をトグル
   */
  const toggleMode = () => {
    setState((prev) => {
      const target: ColorMode = prev.resolvedMode === 'dark' ? 'light' : 'dark';

      // system のままにして resolved だけ変えると、別タブとズレるので
      // 「system のときに toggle されたら明示設定に落とす」挙動にしている
      const nextMode: ColorModePreference = prev.mode === 'system' ? target : target;

      window.localStorage.setItem(storageKey, nextMode);

      return {
        mode: nextMode,
        resolvedMode: target,
      };
    });
  };

  const value = useMemo<ColorModeContextValue>(
    () => ({
      ...state,
      setMode,
      toggleMode,
      isDark: state.resolvedMode === 'dark',
    }),
    [state],
  );

  return <ColorModeContext.Provider value={value}>{children}</ColorModeContext.Provider>;
};
