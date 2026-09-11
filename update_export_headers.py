import re

with open('src/components/DocenteView.tsx', 'r') as f:
    content = f.read()

# Replace in handleExportConsolidatedExcel
old_consolidated = r"""      const headerRow = \['Nº', 'Cod\.', 'Estudiantes'\];\n      trimActivities\.forEach\(act => \{\n        const dateStr = act\.date \? `\[\$\{act\.date\}\] ` : '';\n        headerRow\.push\(`\$\{dateStr\}\$\{act\.name\} \(\$\{act\.component\}\)`\); // Original\n        headerRow\.push\('Ref\. pedag\.'\); // Reinforcement\n        headerRow\.push\('Calif\. Modif\.'\); // Final\n      \}\);\n      headerRow\.push\('Total Ref\. Global', 'Promedio final'\);\n      data\.push\(headerRow\);"""

new_consolidated = """      const headerRow1 = ['Nº', 'Cod.', 'Estudiantes'];
      const headerRow2 = ['', '', ''];
      const headerRow3 = ['', '', ''];

      trimActivities.forEach(act => {
        headerRow1.push(`${act.name} (${act.component})`);
        headerRow1.push('');
        headerRow1.push('');

        headerRow2.push(act.date || '');
        headerRow2.push('');
        headerRow2.push('');

        headerRow3.push('Val. /10');
        headerRow3.push('Ref. pedag.');
        headerRow3.push('Calif. Modif.');
      });

      headerRow1.push('Total Ref. Global', 'Promedio final');
      headerRow2.push('', '');
      headerRow3.push('', '');

      data.push(headerRow1);
      data.push(headerRow2);
      data.push(headerRow3);"""

content = re.sub(old_consolidated, new_consolidated, content)


# Replace in handleExportExcel
old_excel = r"""    const headerRow = \['Nº', 'Cod\.', 'Estudiantes'\];\n    filteredActivities\.forEach\(act => \{\n      const dateStr = act\.date \? `\[\$\{act\.date\}\] ` : '';\n      headerRow\.push\(`\$\{dateStr\}\$\{act\.name\}`\); // Original\n      headerRow\.push\('Ref\. pedag\.'\); // Reinforcement\n      headerRow\.push\('Calif\. Modif\.'\); // Final\n    \}\);\n    headerRow\.push\('Total Ref\. Global', 'Promedio final'\);\n    data\.push\(headerRow\);"""

new_excel = """    const headerRow1 = ['Nº', 'Cod.', 'Estudiantes'];
    const headerRow2 = ['', '', ''];
    const headerRow3 = ['', '', ''];

    filteredActivities.forEach(act => {
      headerRow1.push(`${act.name}`);
      headerRow1.push('');
      headerRow1.push('');

      headerRow2.push(act.date || '');
      headerRow2.push('');
      headerRow2.push('');

      headerRow3.push('Val. /10');
      headerRow3.push('Ref. pedag.');
      headerRow3.push('Calif. Modif.');
    });

    headerRow1.push('Total Ref. Global', 'Promedio final');
    headerRow2.push('', '');
    headerRow3.push('', '');

    data.push(headerRow1);
    data.push(headerRow2);
    data.push(headerRow3);"""

content = re.sub(old_excel, new_excel, content)

with open('src/components/DocenteView.tsx', 'w') as f:
    f.write(content)
