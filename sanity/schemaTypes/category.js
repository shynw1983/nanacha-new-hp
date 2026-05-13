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
      name: "sortOrder",
      title: "表示順",
      type: "number",
      initialValue: 100,
    }),
  ],
});
