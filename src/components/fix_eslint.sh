#!/bin/bash
file="AdminDashboard.tsx"

# Fix TypeScript any type errors
sed -i '23s/record: any, reason: string/record: RawEmployee \& { id: string }, reason: string/' "$file"
sed -i '812s/const json: any\[\] =/const json: Record<string, unknown>[] =/' "$file"
sed -i '830s/rawCategory: any/rawCategory: unknown/' "$file"
sed -i '835s/rawGender: any/rawGender: unknown/' "$file"
sed -i "1769s/e.target.value as any/e.target.value as 'all' | 'activated' | 'not-activated'/" "$file"
sed -i "1960s/e.target.value as any/e.target.value as 'hadir' | 'tidak-hadir' | null/" "$file"
sed -i "2053s/e.target.value as any/e.target.value as 'sholat' | 'puasa'/" "$file"
sed -i "2063s/e.target.value as any/e.target.value as 'daily' | 'weekly' | 'one-time'/" "$file"
sed -i '2557s/data: any,/data: unknown,/' "$file"
sed -i '3234s/data: any,/data: unknown,/' "$file"

# Fix line 1630 (aggregatedData Map)
sed -i '1630s/new Map<string, any>()/new Map<string, { employeeId: string; employeeName: string; date: string; unit: string; professionCategory: string; profession: string; isMonthActivated: boolean; prayers: { subuh: string; dzuhur: string; ashar: string; maghrib: string; isya: string; }; reasons: string[] }>()/' "$file"

echo "TypeScript any type errors fixed"
