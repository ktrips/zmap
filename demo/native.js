// iPhone アプリ(ios/)の中で動いているときだけ、ネイティブ機能(振動・Game Center・共有シート・通知)を呼ぶ。
// ブラウザでは振動とランキングは何もせず、共有は Web Share API かクリップボードで代わりにする。
window.zmapNative = (() => {
  const h = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.zmap;
  const post = (type, data = {}) => { if (h) h.postMessage({ type, ...data }); };
  return {
    inApp: !!h,
    /** kind: "light" | "success" | "error" */
    haptic: (kind) => post("haptic", { kind }),
    /** Game Center はスコアが整数なので、合計点(小数1桁)を10倍して送る */
    score: (total, daily) => post("score", { value: Math.round(total * 10), daily: !!daily }),
    leaderboard: () => post("leaderboard"),
    /** 初めて遊び終えたとき: デイリー問題の通知を許可してよいか聞く(聞くのはアプリ側で1回だけ) */
    askReminder: () => post("askReminder"),
    async share(text) {
      if (h) return post("share", { text });
      if (navigator.share) { try { await navigator.share({ text }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
      await navigator.clipboard.writeText(text);
      alert("結果をコピーしました");
    },
  };
})();
