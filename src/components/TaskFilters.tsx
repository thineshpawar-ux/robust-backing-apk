import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TEAM_MEMBERS } from '@/types/task';

interface TaskFiltersProps {
  filterOwner: string;
  onOwnerChange: (owner: string) => void;
  filterStatus: string;
  onStatusChange: (status: string) => void;
}

export function TaskFilters({
  filterOwner,
  onOwnerChange,
  filterStatus,
  onStatusChange
}: TaskFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <Select value={filterOwner} onValueChange={onOwnerChange}>
        <SelectTrigger className="w-[140px] h-9">
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
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue placeholder="All status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All status</SelectItem>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="closed">Closed</SelectItem>
          <SelectItem value="overdue">Overdue</SelectItem>
          <SelectItem value="pending_closure">Pending Closure</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}