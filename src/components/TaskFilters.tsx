import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TEAM_MEMBERS } from '@/types/task';
import { Search } from 'lucide-react';

interface TaskFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterOwner: string;
  onOwnerChange: (owner: string) => void;
  filterStatus: string;
  onStatusChange: (status: string) => void;
}

export function TaskFilters({
  searchQuery,
  onSearchChange,
  filterOwner,
  onOwnerChange,
  filterStatus,
  onStatusChange
}: TaskFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <div className="relative flex-1 min-w-[160px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by title, notes, owner..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9"
        />
      </div>
      
      <Select value={filterOwner} onValueChange={onOwnerChange}>
        <SelectTrigger className="w-[130px] h-9">
          <SelectValue placeholder="All owners" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All owners</SelectItem>
          {TEAM_MEMBERS.map(member => (
            <SelectItem key={member} value={member}>{member}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select value={filterStatus} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[130px] h-9">
          <SelectValue placeholder="All status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All status</SelectItem>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="closed">Closed</SelectItem>
          <SelectItem value="overdue">Overdue</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
