"use client";

import React from "react";
import { CardSkeleton } from "@/components/ui/loadingSkeleton";
import { EmptyState } from "@/components/ui/emptyState";
import { Building2 } from "lucide-react";

interface Project {
  name: string;
  image: string;
  visits: string;
  bookings: string;
}

interface DashboardProjectsProps {
  isLoading?: boolean;
  projects?: Project[];
}

const defaultProjects: Project[] = [
  {
    name: "Miami Avenue",
    image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400",
    visits: "128 Visits",
    bookings: "14 Bookings",
  },
  {
    name: "Greenville District",
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400",
    visits: "94 Visits",
    bookings: "8 Bookings",
  },
  {
    name: "Skyline Heights",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400",
    visits: "210 Visits",
    bookings: "22 Bookings",
  },
  {
    name: "Emerald Bay",
    image: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400",
    visits: "105 Visits",
    bookings: "11 Bookings",
  },
];

// Simple Project Card Component (inline - merged from ProjectCard simple variant)
function SimpleProjectCard({
  title,
  image,
  visits,
  bookings,
  onClick,
}: {
  title: string;
  image: string;
  visits?: string;
  bookings?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className="border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--background)] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
      role="article"
      aria-label={`Project: ${title}`}
      onClick={onClick}
      suppressHydrationWarning
    >
      <img
        src={image}
        alt={title}
        className="w-full h-[140px] object-cover bg-[var(--surface-neutral)]"
        loading="lazy"
        suppressHydrationWarning
      />
      <div className="p-3" suppressHydrationWarning>
        <h4 className="text-sm font-semibold mb-1 text-[var(--text-dark)]">
          {title}
        </h4>
        <div className="flex justify-between text-xs text-[var(--text-secondary)]" suppressHydrationWarning>
          {visits && <span>{visits}</span>}
          {bookings && <span>{bookings}</span>}
        </div>
      </div>
    </div>
  );
}

export default function DashboardProjects({
  isLoading = false,
  projects = defaultProjects,
}: DashboardProjectsProps) {
  return (
    <section aria-labelledby="top-projects-heading">
      <h2
        id="top-projects-heading"
        className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-[var(--text-dark)]"
      >
        Top Performing Projects
      </h2>
      {isLoading ? (
        <>
          {/* Mobile: Horizontal scrollable */}
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:hidden mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[calc(50vw-1rem)]">
                <CardSkeleton />
              </div>
            ))}
          </div>
          {/* Desktop: Grid layout */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No projects"
          description="You don't have any projects to display at the moment."
          className="mb-6"
        />
      ) : (
        <>
          {/* Mobile: Horizontal scrollable */}
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:hidden mb-6">
            {projects.map((project, idx) => (
              <div key={idx} className="flex-shrink-0 w-[calc(50vw-1rem)]">
                <SimpleProjectCard
                  title={project.name}
                  image={project.image}
                  visits={project.visits}
                  bookings={project.bookings}
                />
              </div>
            ))}
          </div>
          {/* Desktop: Grid layout */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {projects.map((project, idx) => (
              <SimpleProjectCard
                key={idx}
                title={project.name}
                image={project.image}
                visits={project.visits}
                bookings={project.bookings}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
