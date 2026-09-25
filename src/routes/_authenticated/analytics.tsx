import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader } from "@/components/PageHeader";
import { UploadDialog } from "@/components/UploadDialog";
import { documentsQuery, memoriesQuery } from "@/lib/queries";
import { byCategory, byYear, monthlyActivity, topTopics } from "@/lib/insights";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — ChronoMind" },
      { name: "description", content: "Insights generated automatically from your memories." },
      { property: "og:title", content: "Analytics — ChronoMind" },
      { property: "og:description", content: "Activity by month, categories and your most frequent topics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Analytics,
});

const PIE_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

const tooltipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: "0.75rem",
  color: "var(--color-popover-foreground)",
};

function Analytics() {
  const { data: memories = [] } = useQuery(memoriesQuery);
  const { data: documents = [] } = useQuery(documentsQuery);

  const monthly = monthlyActivity(memories);
  const categories = byCategory(memories);
  const topics = topTopics(memories);
  const years = byYear(memories);

  const stats = [
    { label: "Total memories", value: memories.length },
    { label: "Documents", value: documents.length },
    { label: "Dated activities", value: memories.filter((memory) => !memory.date_unknown).length },
    { label: "Categories", value: categories.length },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <PageHeader
        title="Analytics"
        subtitle="Generated automatically from your memories"
        action={<UploadDialog />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="surface-card p-5">
            <p className="font-display text-3xl font-semibold">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="surface-card p-5">
          <h2 className="text-lg font-semibold">Activities by month</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface-card p-5">
          <h2 className="text-lg font-semibold">Memories by category</h2>
          <div className="mt-4 h-64">
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No memories yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categories} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                    {categories.map((entry, index) => (
                      <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="surface-card p-5">
          <h2 className="text-lg font-semibold">Most frequent topics</h2>
          <div className="mt-4 h-64">
            {topics.length === 0 ? (
              <p className="text-sm text-muted-foreground">No topics detected yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topics} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" width={110} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="var(--color-chart-2)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="surface-card p-5">
          <h2 className="text-lg font-semibold">Activity over the years</h2>
          <div className="mt-4 h-64">
            {years.length === 0 ? (
              <p className="text-sm text-muted-foreground">No dated memories yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={years}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="var(--color-chart-3)"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
