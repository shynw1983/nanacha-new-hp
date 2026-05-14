import { defineField, defineType } from "sanity";

export default defineType({
  name: "drink",
  title: "Drink",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "商品名",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "price",
      title: "価格",
      type: "number",
      validation: (Rule) => Rule.required().integer().min(0),
    }),
    defineField({
      name: "category",
      title: "カテゴリー",
      type: "reference",
      to: [{ type: "category" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "temperatures",
      title: "温度",
      type: "array",
      of: [{ type: "string" }],
      options: {
        list: [
          { title: "ICE", value: "ICE" },
          { title: "HOT", value: "HOT" },
        ],
      },
      initialValue: ["ICE"],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: "description",
      title: "説明",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "image",
      title: "商品画像",
      type: "image",
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: "isActive",
      title: "販売中",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "isRecommended",
      title: "おすすめ表示",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "isFeatured",
      title: "トップで大きく表示",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "sortOrder",
      title: "表示順",
      type: "number",
      initialValue: 100,
    }),
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "category.label",
      media: "image",
    },
  },
});
