const homepageData = {
  settings: {
    heroEyebrow: "tapioca & more...",
    heroTitle: "nanacha",
    heroDescription:
      "黒糖タピオカミルク、フルーツティー、八女抹茶ラテ、スムージーまで。素材の香りと選ぶ楽しさを大切にした、気軽に立ち寄れるティースタンドです。",
    primaryButtonLabel: "メニューを見る",
    primaryButtonUrl: "menu.html",
    secondaryButtonLabel: "受け取り予約",
    secondaryButtonUrl: "#reserve",
    seasonEyebrow: "seasonal picks",
    seasonTitle: "季節のおすすめ",
    seasonIntro:
      "春夏はフルーツティーやスムージー、秋冬は黒糖ミルクや抹茶ラテなど、季節に合わせて飲みたい一杯をおすすめしています。",
    footerTextLeft: "nanacha · tapioca & more...",
    footerTextRight: "福岡市中央区清川2-9-6 · online pickup",
  },
  slides: [
    {
      id: "hero-01",
      title: "signature drinks",
      caption: "香りまで楽しむ、nanacha の定番。",
      imageUrl: "assets/nanacha-hero.png",
      altText: "nanacha の人気ドリンク",
      variant: "photo",
      sortOrder: 10,
    },
    {
      id: "hero-02",
      title: "fresh tapioca",
      caption: "もちもち食感の黒糖タピオカ。",
      imageUrl: "assets/menu/drink-01.png",
      altText: "黒糖タピオカミルク",
      variant: "tapioca",
      sortOrder: 20,
    },
    {
      id: "hero-03",
      title: "seasonal pick",
      caption: "新しい一杯も、少しずつ。",
      imageUrl: "assets/menu/drink-08.png",
      altText: "季節のおすすめドリンク",
      variant: "seasonal",
      sortOrder: 30,
    },
  ],
  cards: [
    {
      id: "order-01",
      section: "orderSteps",
      badge: "01",
      title: "ドリンクを選ぶ",
      body: "黒糖タピオカミルク、フラッペ、タピオカティー、スムージーなど、気分に合わせて選べます。",
      sortOrder: 10,
    },
    {
      id: "order-02",
      section: "orderSteps",
      badge: "02",
      title: "サイズを選ぶ",
      body: "S 360ml、R 500ml、L 700ml から選択。しっかり楽しみたい日はラージがおすすめです。",
      sortOrder: 20,
    },
    {
      id: "order-03",
      section: "orderSteps",
      badge: "03",
      title: "甘さ・氷を調整",
      body: "甘さはふつう、多め、少なめ、ゼロ。氷の量も好みに合わせて調整できます。",
      sortOrder: 30,
    },
    {
      id: "order-04",
      section: "orderSteps",
      badge: "04",
      title: "トッピングを追加",
      body: "タピオカ追加、チーズフォーム、オレオ、ホイップなどで、自分好みの一杯にできます。",
      sortOrder: 40,
    },
    {
      id: "guide-01",
      section: "recommendGuide",
      title: "初めての方",
      body: "黒糖タピオカミルク。国産新鮮牛乳と黒糖タピオカの定番人気です。",
      sortOrder: 10,
    },
    {
      id: "guide-02",
      section: "recommendGuide",
      title: "甘さ控えめが好きな方",
      body: "ジャスミンタピオカティーやグリーンタピオカティー。茶葉の香りをすっきり楽しめます。",
      sortOrder: 20,
    },
    {
      id: "guide-03",
      section: "recommendGuide",
      title: "濃厚な味が好きな方",
      body: "オレオ、黒ごま、抹茶、チョコ系のフラッペやミルクがおすすめです。",
      sortOrder: 30,
    },
    {
      id: "guide-04",
      section: "recommendGuide",
      title: "暑い日や食後に",
      body: "フルーツティー、蜂蜜柚子茶、マンゴーヨーグルトスムージーでさっぱり。",
      sortOrder: 40,
    },
    {
      id: "season-01",
      section: "seasonalPicks",
      title: "濃厚マンゴーヨーグルトスムージー",
      body: "マンゴーとヨーグルトの濃厚な組み合わせ。暑い日にもデザートにも。",
      sortOrder: 10,
    },
    {
      id: "season-02",
      section: "seasonalPicks",
      title: "蜂蜜柚子ジャスミン茶",
      body: "蜂蜜柚子の香りとジャスミン茶のすっきり感を楽しめる一杯。",
      sortOrder: 20,
    },
    {
      id: "season-03",
      section: "seasonalPicks",
      title: "黒糖タピオカ八女抹茶ラテ",
      body: "福岡県八女産抹茶 100% 使用。抹茶の香りと黒糖タピオカが好相性です。",
      sortOrder: 30,
    },
    {
      id: "story-01",
      section: "story",
      title: "店内抽出のお茶",
      body: "アッサム紅茶、ジャスミン茶、ルイボス茶、国産緑茶など、香りを活かしたティーメニューを揃えています。",
      sortOrder: 10,
    },
    {
      id: "story-02",
      section: "story",
      title: "もちもちの黒糖タピオカ",
      body: "ミルク、ラテ、ティー、コーヒーまで、黒糖タピオカの食感を楽しめるメニューを用意しています。",
      sortOrder: 20,
    },
    {
      id: "story-03",
      section: "story",
      title: "福岡らしい素材",
      body: "八女抹茶を使ったラテやフラッペなど、福岡で楽しみたい味わいも大切にしています。",
      sortOrder: 30,
    },
  ],
  stores: [
    {
      id: "kiyokawa",
      statusLabel: "open now",
      name: "福岡清川店",
      summary: "福岡市中央区清川の路面店。テイクアウト・受け取り予約に対応。",
      postalCode: "〒810-0005",
      address: "福岡市中央区清川2-9-6",
      intro: "清川通りから少し入った路面店です。テイクアウトは店頭右側の pickup desk で受け取れます。",
      hours: "12:00-00:30",
      closedDays: "不定休",
      nearestStation: "渡辺通駅・西鉄平尾駅エリア",
      usage: "テイクアウト・受け取り予約",
      paymentNote: "Square決済対応予定",
      googleMapsUrl:
        "https://www.google.com/maps/search/?api=1&query=%E7%A6%8F%E5%B2%A1%E5%B8%82%E4%B8%AD%E5%A4%AE%E5%8C%BA%E6%B8%85%E5%B7%9D2-9-6",
      googleMapsEmbedUrl:
        "https://www.google.com/maps?q=%E7%A6%8F%E5%B2%A1%E5%B8%82%E4%B8%AD%E5%A4%AE%E5%8C%BA%E6%B8%85%E5%B7%9D2-9-6&output=embed",
      sortOrder: 10,
    },
    {
      id: "next-store",
      statusLabel: "coming soon",
      name: "次の店舗",
      summary: "新しい店舗情報は、準備が整い次第こちらでお知らせします。",
      sortOrder: 20,
    },
  ],
  faqs: [
    {
      id: "faq-01",
      question: "タピオカ抜きはできますか？",
      answer:
        "対象メニューはタピオカ抜きにできます。スムージーやスペシャルなど、もともとタピオカが入っていない商品もあります。",
      sortOrder: 10,
    },
    {
      id: "faq-02",
      question: "甘さゼロや氷抜きは選べますか？",
      answer: "甘さはゼロ、少なめ、ふつう、多めから選べます。氷はふつう、少なめ、氷抜きに対応しています。",
      sortOrder: 20,
    },
    {
      id: "faq-03",
      question: "テイクアウトできますか？",
      answer: "はい。福岡清川店ではテイクアウトでの受け取りに対応しています。受け取り予約も利用できます。",
      sortOrder: 30,
    },
    {
      id: "faq-04",
      question: "カフェインが気になる場合は？",
      answer: "デカフェ変更に対応できるメニューがあります。気になる方は注文時にご確認ください。",
      sortOrder: 40,
    },
    {
      id: "faq-05",
      question: "アレルギー情報は確認できますか？",
      answer:
        "牛乳、豆乳、ナッツ、ごま、チョコレートなどを使う商品があります。アレルギーをお持ちの方は注文前にスタッフへご相談ください。",
      sortOrder: 50,
    },
    {
      id: "faq-06",
      question: "場所はどこですか？",
      answer: "福岡市中央区清川2-9-6です。渡辺通駅・西鉄平尾駅エリアからアクセスしやすい路面店です。",
      sortOrder: 60,
    },
  ],
};

if (typeof module !== "undefined") {
  module.exports = homepageData;
}

if (typeof window !== "undefined") {
  window.NANACHA_HOMEPAGE = homepageData;
}
