type ViewMode = 'cards' | 'map';

interface Props {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
}

const ITEMS: { id: ViewMode; icon: string; label: string }[] = [
  { id: 'cards', icon: '🌿', label: 'Actividades' },
  { id: 'map', icon: '🗺️', label: 'Mapa' },
];

export default function Sidebar({ view, onChange }: Props) {
  return (
    <aside className="sidebar-imbio hidden md:flex w-52 shrink-0 flex-col bg-[#002A5C] py-3">
      {ITEMS.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={`flex items-center gap-2.5 px-5 py-3.5 text-[0.95rem] text-white/80 hover:bg-white/10 hover:text-white ${
            view === item.id ? 'active' : ''
          }`}
          onClick={(e) => {
            e.preventDefault();
            onChange(item.id);
          }}
        >
          <span className="w-7 text-center text-lg" aria-hidden>
            {item.icon}
          </span>
          {item.label}
        </a>
      ))}
    </aside>
  );
}
