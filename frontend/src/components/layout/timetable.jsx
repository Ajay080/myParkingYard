import React from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const subjectIcon = (subject) => {
  const icons = {
    Math: "🧮", Science: "🧪", English: "📚", History: "🏰",
    Art: "🎨", Music: "🎵", "Computer Science": "💻",
    "Physical Education": "🏃‍♂️", "Lunch Break": "🍱"
  };
  return icons[subject] || "";
};

const TimetableTable = ({ timetable, selectedDay }) => {
  console.log("TimetableTable Props:", { timetable, selectedDay });
  console.log(`Data for selectedDay (${selectedDay}):`, timetable?.[selectedDay]);

  return (
    <Card>
      <CardHeader><CardTitle>{selectedDay} Timetable</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Teacher</TableHead>
              <TableHead>Substitute</TableHead>
              <TableHead>Room</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(timetable?.[selectedDay] || []).map((entry, index) => {
              console.log(`Rendering entry for ${selectedDay} at index ${index}:`, entry);

              if (!entry || typeof entry !== "object") {
                console.warn(`Invalid entry at index ${index}:`, entry);
                return null;
              }

              return (
                <TableRow
                  key={index}
                  className={`hover:bg-purple-100 transition ${entry.subject === "Lunch Break"
                      ? "bg-pink-50 font-semibold text-pink-600"
                      : index % 2 === 0
                        ? "bg-white"
                        : "bg-gray-50"
                    }`}
                >
                  <TableCell>{entry.time || "N/A"}</TableCell>
                  <TableCell>
                    {subjectIcon(entry.subject || "")} {entry.subject || "N/A"}
                  </TableCell>
                  <TableCell>{entry.teacher || "N/A"}</TableCell>
                  <TableCell>{entry.substitute || "-"}</TableCell>
                  <TableCell>{entry.room || "-"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>

        </Table>
      </CardContent>
    </Card>
  );
}

export default TimetableTable;
