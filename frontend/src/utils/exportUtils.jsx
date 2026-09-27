import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Export CSV Utility
export const exportToCSV = (filename, headers, rows) => {
  let csvContent = "data:text/csv;charset=utf-8,"
    + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link); // Required for Firefox
  link.click();
};

// Export PDF Utility
export const exportToPDF = (filename, title, headers, rows) => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(title, 105, 20, null, null, 'center');

  autoTable(doc, {
    startY: 30,
    head: [headers],
    body: rows,
    styles: { halign: 'center' },
  });

  doc.save(filename);
};

// Print Utility
export const printContentById = (elementId, title = "Document") => {
  const printContent = document.getElementById(elementId)?.innerHTML;
  if (!printContent) return;

  const printWindow = window.open("", "", "width=900,height=650");
  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
      </head>
      <body>
        ${printContent}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
};
