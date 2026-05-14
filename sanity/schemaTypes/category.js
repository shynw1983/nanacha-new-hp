import { defineField, defineType } from "sanity";

export default defineType({
  name: "category",
  title: "Category",
  type: "document",
  fields: [
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
      name: "note",
      title: "説明",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "isTapiocaFree",
      title: "タピオカなしカテゴリー",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "hasWhipByDefault",
      title: "ホイップ標準カテゴリー",
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
});
