import { defineField, defineType } from "sanity";

const pricedItem = [
  defineField({
    name: "id",
    title: "ID",
    type: "string",
    validation: (Rule) => Rule.required(),
  }),
  defineField({
    name: "label",
    title: "表示名",
    type: "string",
    validation: (Rule) => Rule.required(),
  }),
  defineField({
    name: "price",
    title: "価格差",
    type: "number",
    initialValue: 0,
    validation: (Rule) => Rule.required().integer(),
  }),
];

export default defineType({
  name: "menuSettings",
  title: "Menu Settings",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "管理名",
      type: "string",
      initialValue: "Menu Settings",
      readOnly: true,
    }),
    defineField({
      name: "sizes",
      title: "サイズ",
      type: "array",
      of: [
        {
          type: "object",
          fields: pricedItem,
          preview: {
            select: { title: "label", subtitle: "price" },
          },
        },
      ],
    }),
    defineField({
      name: "sweetness",
      title: "甘さ",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "ice",
      title: "氷の量",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "hotIce",
      title: "HOT用の氷表示",
      type: "string",
    }),
    defineField({
      name: "options",
      title: "オプション",
      type: "array",
      of: [
        {
          type: "object",
          fields: pricedItem,
          preview: {
            select: { title: "label", subtitle: "price" },
          },
        },
      ],
    }),
    defineField({
      name: "toppings",
      title: "トッピング",
      type: "array",
      of: [
        {
          type: "object",
          fields: pricedItem,
          preview: {
            select: { title: "label", subtitle: "price" },
          },
        },
      ],
    }),
  ],
});
