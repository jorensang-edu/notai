import re

with open('src/components/DocenteView.tsx', 'r') as f:
    content = f.read()

content = re.sub(
    r"import { PlusCircle, LogOut, Table, SlidersHorizontal, ChevronDown, ChevronUp, Trash2, Download, StickyNote, Search, BarChart2 } from 'lucide-react';",
    r"import { PlusCircle, LogOut, Table, SlidersHorizontal, ChevronDown, ChevronUp, Trash2, Download, StickyNote, Search, BarChart2, AlertTriangle } from 'lucide-react';\nimport { auth } from '../firebase';",
    content
)

with open('src/components/DocenteView.tsx', 'w') as f:
    f.write(content)
