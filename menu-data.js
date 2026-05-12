(function (root, factory) {
  const data = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = data;
  }

  if (root) {
    root.NANACHA_MENU = data;
  }
})(typeof window !== "undefined" ? window : globalThis, function () {
  const categories = [
    { id: "frappe", label: "タピオカフラッペ" },
    { id: "milk", label: "タピオカミルク" },
    { id: "smoothie", label: "スムージー" },
    { id: "cheese-tea", label: "タピオカチーズティー" },
    { id: "tea", label: "タピオカティー" },
    { id: "special", label: "スペシャル" },
    { id: "coffee", label: "タピオカコーヒー" },
    { id: "tea-coffee", label: "Tea & Coffee" },
  ];

  const drinks = [
    ["濃厚黒ごまチーズタピオカフラッペ", 1080, "frappe"],
    ["キャラメルタピオカフラッペ", 980, "frappe"],
    ["バニラタピオカフラッペ", 980, "frappe"],
    ["チョコミントタピオカフラッペ", 1080, "frappe"],
    ["オレオタピオカフラッペ", 980, "frappe"],
    ["バナナタピオカフラッペ", 1080, "frappe"],
    ["チョコタピオカフラッペ", 980, "frappe"],
    ["抹茶タピオカフラッペ", 980, "frappe"],
    ["濃厚黒ごまタピオカミルク", 980, "milk"],
    ["濃厚ピーナッツタピオカミルク", 980, "milk"],
    ["黒糖タピオカ練乳いちごミルク", 980, "milk"],
    ["黒糖タピオカオレオミルク", 740, "milk"],
    ["黒糖タピオカ塩キャラメルミルク", 640, "milk"],
    ["黒糖タピオカチョコミルク", 640, "milk"],
    ["黒糖タピオカミルク", 590, "milk"],
    ["バナナ豆乳黒ごまスムージー", 1080, "smoothie"],
    ["八女抹茶バナナスムージー", 1180, "smoothie"],
    ["特製ミックスジューススムージー", 1500, "smoothie"],
    ["バナナヨーグルトスムージー", 1080, "smoothie"],
    ["濃厚マンゴーヨーグルトスムージー", 1500, "smoothie"],
    ["アッサム紅茶タピオカチーズティー", 750, "cheese-tea"],
    ["ルイボスタピオカチーズティー", 750, "cheese-tea"],
    ["ジャスミンタピオカチーズティー", 750, "cheese-tea"],
    ["グリーンタピオカチーズティー", 750, "cheese-tea"],
    ["黒糖タピオカほうじ茶ラテ", 680, "tea"],
    ["黒糖タピオカ八女抹茶ラテ", 640, "tea"],
    ["アッサム紅茶タピオカミルクティー", 640, "tea"],
    ["ジャスミンタピオカミルクティー", 640, "tea"],
    ["グリーンタピオカミルクティー", 640, "tea"],
    ["ルイボスタピオカティー", 590, "tea"],
    ["アッサム紅茶タピオカティー", 590, "tea"],
    ["ジャスミンタピオカティー", 590, "tea"],
    ["グリーンタピオカティー", 590, "tea"],
    ["ピーチクリーミー杏仁", 690, "special"],
    ["きなこ豆乳くろごま", 640, "special"],
    ["ピーチ紅茶", 640, "special"],
    ["蜂蜜柚子茶", 590, "special"],
    ["蜂蜜柚子アッサム紅茶", 640, "special"],
    ["蜂蜜柚子ジャスミン茶", 640, "special"],
    ["蜂蜜柚子緑茶", 640, "special"],
    ["タピオカカフェラテ", 640, "coffee"],
    ["タピオカコーヒー", 590, "coffee"],
    ["緑茶", 490, "tea-coffee"],
    ["アッサム紅茶", 490, "tea-coffee"],
    ["プアール茶", 490, "tea-coffee"],
    ["ジャスミン茶", 490, "tea-coffee"],
    ["ルイボス茶", 490, "tea-coffee"],
    ["カフェアメリカーノ", 490, "tea-coffee"],
    ["カフェラテ", 490, "tea-coffee"],
  ].map(([name, price, category]) => ({ name, price, category }));

  const sizes = [
    { id: "small", label: "S スモール 360ml", price: -50 },
    { id: "regular", label: "R レギュラー 500ml", price: 0 },
    { id: "large", label: "L ラージ 700ml", price: 250 },
  ];

  const sweetness = ["ふつう", "多め", "少なめ", "ゼロ"];
  const ice = ["ふつう", "氷少なめ", "氷抜き"];

  const options = [
    { id: "none", label: "なし", price: 0 },
    { id: "premium", label: "プレミアム版", price: 300 },
    { id: "soy", label: "豆乳変更", price: 50 },
    { id: "decaf", label: "デカフェ", price: 50 },
  ];

  const toppings = [
    { id: "extra-tapioca", label: "タピオカ追加", price: 150 },
    { id: "extra-oreo", label: "オレオ追加", price: 150 },
    { id: "extra-whip", label: "ホイップ追加", price: 150 },
    { id: "choco-chip", label: "チョコチップ追加", price: 70 },
    { id: "cheese-foam", label: "チーズフォーム追加", price: 300 },
    { id: "no-tapioca", label: "タピオカ抜き", price: -50 },
    { id: "no-whip", label: "ホイップ抜き", price: 0 },
  ];

  const tapiocaFreeCategories = ["smoothie", "special", "tea-coffee"];

  return { categories, drinks, sizes, sweetness, ice, options, toppings, tapiocaFreeCategories };
});
