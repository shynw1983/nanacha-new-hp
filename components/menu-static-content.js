"use client";

import { useI18n } from "./i18n-provider";

const findSection = (sections = [], key) => sections.find((section) => section.sectionKey === key) || {};

export function MenuIntro({ sections = [] }) {
  const { t } = useI18n();
  const hero = findSection(sections, "menu-hero");

  return (
    <section className="menu-hero" aria-labelledby="menu-page-title">
      <p className="eyebrow eyebrow-with-decor">
        <img src="/assets/decor/tapioca-one.png" alt="" aria-hidden="true" />
        {hero.subtitle || "nanacha full menu"}
      </p>
      <h1 id="menu-page-title" className="title-with-decor">
        {hero.title || "nanacha menu"}
        <img className="title-decor" src="/assets/decor/sunglasses.png" alt="" aria-hidden="true" />
      </h1>
      <p>
        {t(hero.body || "nanacha のタピオカミルク、フラッペ、チーズティー、スムージー、ティー、コーヒーまで。 サイズ・甘さ・氷の量・トッピングを選んで、自分好みの一杯に。")}
      </p>
    </section>
  );
}

export function MenuInfo({ sections = [] }) {
  const { t } = useI18n();
  const info = findSection(sections, "allergy-caffeine");

  return (
    <section className="menu-info-section" aria-labelledby="menu-info-title">
      <div className="category-heading">
        <p className="eyebrow">{info.subtitle || "menu information"}</p>
        <h2 id="menu-info-title" className="heading-with-decor">
          {t(info.title || "アレルギー・カフェインについて")}
          <img src="/assets/decor/tapioca-two.png" alt="" aria-hidden="true" />
        </h2>
      </div>
      <div className="info-grid">
        <article>
          <h3>{t("アレルギー")}</h3>
          <p>{t("牛乳、豆乳、ナッツ、ごま、チョコレート、オレオ、ホイップ、チーズフォームなどを使用する商品があります。アレルギーをお持ちの方は注文前にスタッフへご確認ください。")}</p>
        </article>
        <article>
          <h3>{t("カフェイン")}</h3>
          <p>{t("紅茶、緑茶、ほうじ茶、ジャスミン茶、コーヒーを使う商品にはカフェインが含まれる場合があります。デカフェ変更は対応可能な商品で選べます。")}</p>
        </article>
        <article>
          <h3>{t("甘さ・氷")}</h3>
          <p>{t("甘さゼロ、少なめ、ふつう、多め、氷少なめ、氷抜きに対応しています。すっきり飲みたい方は甘さ少なめがおすすめです。")}</p>
        </article>
      </div>
    </section>
  );
}
