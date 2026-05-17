"use client";

import { useEffect, useState } from "react";

const normalizeAssetUrl = (url = "") =>
  url.startsWith("http") || url.startsWith("/") ? url : `/${url}`;

export function HeroCarousel({ slides }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 4800);

    return () => window.clearInterval(timer);
  }, [slides.length]);

  const showPrevious = () => setActiveIndex((current) => (current - 1 + slides.length) % slides.length);
  const showNext = () => setActiveIndex((current) => (current + 1) % slides.length);

  return (
    <figure className="hero-visual hero-carousel" aria-label="nanacha の紹介" data-react-hero-carousel>
      <div className="hero-slides">
        {slides.map((slide, index) => (
          <article className={`hero-slide${index === activeIndex ? " is-active" : ""}`} key={slide.id}>
            <img src={normalizeAssetUrl(slide.imageUrl)} alt={slide.altText || slide.title} />
            <figcaption>
              <span>{slide.title}</span>
              {slide.caption}
            </figcaption>
          </article>
        ))}
      </div>
      <div className="hero-carousel-controls">
        <button type="button" onClick={showPrevious} aria-label="前の画像を見る">
          ←
        </button>
        <div className="hero-carousel-dots" aria-label="スライドを選択">
          {slides.map((slide, index) => (
            <button
              type="button"
              className={index === activeIndex ? "is-active" : ""}
              onClick={() => setActiveIndex(index)}
              aria-label={`${index + 1}枚目の画像`}
              key={slide.id}
            />
          ))}
        </div>
        <button type="button" onClick={showNext} aria-label="次の画像を見る">
          →
        </button>
      </div>
    </figure>
  );
}
