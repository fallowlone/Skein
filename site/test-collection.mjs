import { getCollection } from "astro:content";

const lessons = await getCollection("lessons");
const graphLessons = lessons.filter(l => l.data.unit === "09-graphs");

console.log(`Total lessons: ${lessons.length}`);
console.log(`Graph lessons: ${graphLessons.length}`);
graphLessons.forEach(l => {
  console.log(`  ${l.data.lang}: ${l.data.slug}`);
});
