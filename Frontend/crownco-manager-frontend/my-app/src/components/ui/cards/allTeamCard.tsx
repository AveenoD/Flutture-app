import { Users, Briefcase, Edit } from "lucide-react";
import Image from "next/image";

interface AllTeamCardProps {
  avatarSrc: string;
  teamName: string;
  leadName: string;
  memberCount: number;
  projectCount: number;
  tags: string[];
  onEditClick?: () => void;
  onViewAllMembersClick?: () => void;
  buttonText?: string;
}

export default function AllTeamCard({
  avatarSrc,
  teamName,
  leadName,
  memberCount,
  projectCount,
  tags,
  onEditClick,
  onViewAllMembersClick,
  buttonText = "View All Member",
}: AllTeamCardProps) {
  // Tag color mapping - purple for first tag, green for second, etc.
  const getTagColors = (index: number) => {
    const colors = [
      { bg: "bg-[#F3E8FF]", text: "text-[#7E22CE]" }, // Purple
      { bg: "bg-[#DCFCE7]", text: "text-[#15803D]" }, // Green
      { bg: "bg-[#EFF8FF]", text: "text-[#175CD3]" }, // Blue
      { bg: "bg-[#FFFAEB]", text: "text-[#B54708]" }, // Orange
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="bg-[var(--background)] border border-[var(--border-color)] rounded-[10px] shadow-sm p-4 flex flex-col gap-4 hover:shadow-md transition-all duration-200">
      {/* Top Section: Avatar, Team Name, Lead Name, Edit Button */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <Image
              src={avatarSrc}
              alt={teamName}
              width={48}
              height={48}
              className="rounded-full object-cover"
            />
          </div>

          {/* Team and Lead Names */}
          <div className="flex flex-col min-w-0 flex-1">
            <h3 className="text-base font-semibold text-[var(--text-dark)] truncate">
              {teamName}
            </h3>
            <p className="text-sm text-[var(--text-secondary)] truncate">
              {leadName}
            </p>
          </div>
        </div>

        {/* Edit Icon Button */}
        {onEditClick && (
          <button
            onClick={onEditClick}
            className="flex-shrink-0 w-8 h-8 rounded-md border border-[var(--primary-base)] bg-white flex items-center justify-center hover:bg-[var(--hover-bg)] transition-colors"
            aria-label="Edit team"
          >
            <Edit size={14} className="text-[var(--primary-base)]" />
          </button>
        )}
      </div>

      {/* Middle Section: Statistics and Tags */}
      <div className="flex flex-col gap-3">
        {/* Members Count */}
        <div className="flex items-center gap-2">
          <Users size={18} className="text-[var(--primary-base)] flex-shrink-0" />
          <span className="text-sm text-[var(--text-dark)] font-medium">
            {memberCount} Member{memberCount !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Projects Assigned */}
        <div className="flex items-center gap-2">
          <Briefcase size={18} className="text-[var(--primary-base)] flex-shrink-0" />
          <span className="text-sm text-[var(--text-dark)] font-medium">
            {projectCount} Project{projectCount !== 1 ? "s" : ""} Assigned
          </span>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {tags.map((tag, index) => {
              const colors = getTagColors(index);
              return (
                <span
                  key={index}
                  className={`px-2 py-1 rounded text-[10px] font-semibold ${colors.bg} ${colors.text}`}
                >
                  {tag}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Section: View All Members Button */}
      <div className="pt-3 border-t border-[var(--border-color)]">
        <button
          onClick={onViewAllMembersClick}
          className="w-full py-2.5 bg-[var(--primary-base)] text-white rounded-md text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}
