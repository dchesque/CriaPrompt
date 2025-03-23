import { SearchIcon } from "lucide-react"

export function SearchBar() {
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <SearchIcon className="w-4 h-4 text-gray-400" />
      </div>
      <input
        type="search"
        className="bg-background/30 backdrop-blur-xl border border-white/20 text-sm rounded-md block w-full pl-10 p-2.5 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
        placeholder="Buscar prompts..."
        required
      />
    </div>
  )
} 