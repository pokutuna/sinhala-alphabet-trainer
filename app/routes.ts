import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("lesson", "routes/lesson.tsx"),
  route("table", "routes/table.tsx"),
  route("quiz", "routes/quiz.tsx"),
  route("convert", "routes/convert.tsx"),
] satisfies RouteConfig;
