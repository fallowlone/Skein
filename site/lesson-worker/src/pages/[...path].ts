import type { APIRoute } from "astro";

export const GET: APIRoute = ({ request }) => fetch(request);
export const HEAD = GET;
