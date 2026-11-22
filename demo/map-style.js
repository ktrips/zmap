// Google Map モード用: 答えのヒントになる地図ラベルを隠すスタイル。
// 使い方: new google.maps.Map(el, { styles: ZMAP_MAP_STYLE.hideLabels, ... })
// ※ mapId(クラウドベースのマップスタイル)を使う場合は styles が無視されるため、
//    Cloud Console 側で同等のスタイル(ラベル非表示)を設定すること。
window.ZMAP_MAP_STYLE = {
  // 全ラベル(地名・道路名・店名・行政区名・番地)とアイコンを非表示。道路・水域・地形の形は残す。
  hideLabels: [
    { elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "administrative", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
  ],
  // 難易度が高いほど情報を削る案: 行政境界線も隠す(VD向け)。
  hideLabelsAndBoundaries: [
    { elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ visibility: "off" }] },
  ],
};
