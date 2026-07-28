interface BlogSectionHeaderProps {
  label: string;
  className?: string;
}

export default function BlogSectionHeader({
  label,
  className = 'mb-6',
}: BlogSectionHeaderProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
      <h2 className="text-[13px] font-mono font-medium uppercase tracking-normal text-gray-900 leading-none !mb-0">
        {label}
      </h2>
    </div>
  );
}
