import { Link } from "react-router";
import { Glyph } from "~/components/Glyph";
import type { Route } from "./+types/home";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Sinhala Alphabet Trainer" },
    {
      name: "description",
      content:
        "シンハラ文字を表とクイズで学ぶ。子音マトリクス・母音・母音記号、覚え方とフォント比較つき。",
    },
  ];
}

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <header className="mb-12 text-center">
        <Glyph
          text="සිංහල"
          className="block text-7xl text-gray-900 dark:text-white"
        />
        <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">
          シンハラ文字トレーナー
        </h1>
        <p className="mt-3 text-gray-600 dark:text-gray-300">
          子音・母音・母音記号を、表で見てクイズで覚える。
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card
          to="/lesson"
          title="1文字ずつ学ぶ"
          desc="母音・子音を順番に。パーツ分けの説明と覚え方つきで、前へ/次へめくって学習。"
        />
        <Card
          to="/table"
          title="文字表で見る"
          desc="合成表(子音×母音)や母音記号を一覧。タップで大きな表示・覚え方・フォント比較。"
        />
        <Card
          to="/quiz"
          title="クイズで覚える"
          desc="文字↔読み(かな/ローマ字/IPA)を4択で。難易度を選んで累積的に練習。"
        />
      </div>

      <section className="mt-12 text-sm text-gray-500">
        <p>
          シンハラ文字はアブギダ(音節文字)。子音字が「子音+a」を内蔵し、母音記号
          (pilla) を付けて他の母音を表します。まずは Lv1 の基本子音から。
        </p>
      </section>
    </main>
  );
}

function Card({
  to,
  title,
  desc,
}: {
  to: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="block rounded-2xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
    >
      <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
        {title}
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-300">{desc}</p>
    </Link>
  );
}
