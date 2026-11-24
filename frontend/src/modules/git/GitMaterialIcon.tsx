import { resolveFileIconName, resolveFolderIconName } from './gitMaterialIconMap';

interface GitMaterialIconProps {
  name: string;
  type: 'dir' | 'file';
  open?: boolean;
  className?: string;
}

export function GitMaterialIcon({
  name,
  type,
  open = false,
  className = 'h-4 w-4 shrink-0',
}: GitMaterialIconProps) {
  const iconName = type === 'dir' ? resolveFolderIconName(name, open) : resolveFileIconName(name);
  return (
    <img
      src={`/material-icons/${iconName}.svg`}
      alt=""
      aria-hidden="true"
      draggable={false}
      loading="lazy"
      className={`${className} select-none object-contain`}
    />
  );
}
