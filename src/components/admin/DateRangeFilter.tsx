import { useState } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type DateRange = {
  start: Date;
  end: Date;
};

type FilterOption = 'today' | 'yesterday' | '7days' | '14days' | '30days' | 'custom';

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const filterOptions: { key: FilterOption; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: 'yesterday', label: 'Ontem' },
  { key: '7days', label: '7 dias' },
  { key: '14days', label: '14 dias' },
  { key: '30days', label: '30 dias' },
  { key: 'custom', label: 'Ver+' },
];

export function getDateRange(filter: FilterOption): DateRange {
  const now = new Date();
  const today = startOfDay(now);

  switch (filter) {
    case 'today':
      return { start: today, end: endOfDay(now) };
    case 'yesterday':
      return { start: startOfDay(subDays(today, 1)), end: endOfDay(subDays(today, 1)) };
    case '7days':
      return { start: startOfDay(subDays(today, 6)), end: endOfDay(now) };
    case '14days':
      return { start: startOfDay(subDays(today, 13)), end: endOfDay(now) };
    case '30days':
      return { start: startOfDay(subDays(today, 29)), end: endOfDay(now) };
    default:
      return { start: today, end: endOfDay(now) };
  }
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [activeFilter, setActiveFilter] = useState<FilterOption>('today');
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>({});
  const [isOpen, setIsOpen] = useState(false);

  const handleFilterClick = (filter: FilterOption) => {
    if (filter === 'custom') {
      return; // Don't change anything, just let the popover handle it
    }
    setActiveFilter(filter);
    onChange(getDateRange(filter));
  };

  const handleCustomRangeSelect = () => {
    if (customRange.from && customRange.to) {
      setActiveFilter('custom');
      onChange({
        start: startOfDay(customRange.from),
        end: endOfDay(customRange.to),
      });
      setIsOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 flex-nowrap">
      {filterOptions.map((option) => (
        option.key === 'custom' ? (
          <Popover key={option.key} open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={activeFilter === 'custom' ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  "h-7 sm:h-8 text-xs px-2 sm:px-3 whitespace-nowrap",
                  activeFilter === 'custom' && "bg-primary text-primary-foreground"
                )}
              >
                <CalendarIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                {activeFilter === 'custom' && customRange.from && customRange.to
                  ? `${format(customRange.from, 'dd/MM', { locale: ptBR })} - ${format(customRange.to, 'dd/MM', { locale: ptBR })}`
                  : option.label
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-3 space-y-3">
                <Calendar
                  mode="range"
                  selected={{ from: customRange.from, to: customRange.to }}
                  onSelect={(range) => setCustomRange({ from: range?.from, to: range?.to })}
                  numberOfMonths={2}
                  locale={ptBR}
                  className="pointer-events-auto"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleCustomRangeSelect}
                    disabled={!customRange.from || !customRange.to}
                  >
                    Aplicar
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <Button
            key={option.key}
            variant={activeFilter === option.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterClick(option.key)}
            className={cn(
              "h-7 sm:h-8 text-xs px-2 sm:px-3 whitespace-nowrap",
              activeFilter === option.key && "bg-primary text-primary-foreground"
            )}
          >
            {option.label}
          </Button>
        )
      ))}
    </div>
  );
}
