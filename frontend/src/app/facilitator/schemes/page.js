"use client";

import { useState } from "react";
import CurriculumPicker from "@/components/CurriculumPicker";
import {
  Field, Select, MoreOptions, useGenerate, SubmitButton, ErrorNote, useRemembered,
  inputCls, YEAR, WEEKS, PER_WEEK, TERMS,
} from "@/components/studio/StudioForm";

export default function SchemesPage() {
  const [sel, setSel] = useState(null);
  const [term, setTerm] = useState("1");
  const [year, setYear] = useState(YEAR);
  const [weeks, setWeeks] = useState("12");
  const [perWeek, setPerWeek] = useState("5");
  const [firstWeek, setFirstWeek] = useState("1");
  const [startDate, setStartDate] = useState("");
  const [breaks, setBreaks] = useState({});        // {week: label}
  const [notes, setNotes] = useState("");
  const [reserve, setReserve] = useState("0");
  const [school, setSchool] = useRemembered("school");
  const [teacher, setTeacher] = useRemembered("teacher");
  const [className, setClassName] = useState("");
  const { run, busy, error } = useGenerate("/facilitator/schemes/generate/");

  const first = Number(firstWeek) || 1;
  const weekNumbers = Array.from({ length: Number(weeks) }, (_, i) => first + i);
  const toggleBreak = (w) =>
    setBreaks((b) => {
      const n = { ...b };
      if (n[w] !== undefined) delete n[w];
      else n[w] = "No lessons";
      return n;
    });
  const teachingWeeks = weekNumbers.filter((w) => breaks[w] === undefined).length;
  const strandsTicked = sel?.strandIds?.length || 0;

  const submit = () =>
    run({
      grade: sel.grade, subject: sel.subjectId, strands: sel.strandIds,
      term, year, weeks, lessons_per_week: perWeek, first_week: firstWeek,
      start_date: startDate, break_weeks: breaks, notes, reserve, school, teacher, class_name: className,
    });

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">Schemes of Work</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">
        Plan a term week by week from the KICD curriculum design. Every sub-strand gets the lessons KICD suggests,
        in curriculum order - then edit it, print it or download it for Word.
      </p>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 space-y-5">
        <CurriculumPicker onSelect={setSel} wholeSubject />
        {sel && (
          <p className="text-xs text-gray-500 -mt-2">
            {strandsTicked
              ? `${strandsTicked} strand${strandsTicked > 1 ? "s" : ""} this term.`
              : "No strands ticked: the year's design is split across the three terms, so Term 2 starts where Term 1 ends."}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Term"><Select value={term} onChange={setTerm} options={TERMS} /></Field>
          <Field label="Year"><input value={year} onChange={(e) => setYear(e.target.value)} className={inputCls} /></Field>
          <Field label="Weeks in the term"><Select value={weeks} onChange={setWeeks} options={WEEKS} /></Field>
          <Field label="Lessons per week"><Select value={perWeek} onChange={setPerWeek} options={PER_WEEK} /></Field>
        </div>

        <MoreOptions>
          <div className="grid grid-cols-2 gap-4">
            <Field label="School" optional><input value={school} onChange={(e) => setSchool(e.target.value)} className={inputCls} /></Field>
            <Field label="Teacher" optional><input value={teacher} onChange={(e) => setTeacher(e.target.value)} className={inputCls} /></Field>
            <Field label="Class or stream" optional><input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="For example: 7 East" className={inputCls} /></Field>
            <Field label="Lessons for revision and exams" hint="At the end of term. None by default - the whole term is taught.">
              <Select value={reserve} onChange={setReserve}
                options={Array.from({ length: 11 }, (_, i) => [String(i), i === 0 ? "None" : `${i} lesson${i > 1 ? "s" : ""}`])} />
            </Field>
            <Field label="First teaching week number"><input type="number" min="1" max="52" value={firstWeek} onChange={(e) => setFirstWeek(e.target.value)} className={inputCls} /></Field>
            <Field label="Monday of the first week" optional className="col-span-2" hint="Each week then shows its dates.">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
            </Field>
          </div>

          <Field label="Weeks without lessons" optional hint="Tick half-term, opener or exam weeks. They stay in the table as breaks.">
            <div className="flex flex-wrap gap-2">
              {weekNumbers.map((w) => (
                <button key={w} type="button" onClick={() => toggleBreak(w)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold border ${breaks[w] !== undefined
                    ? "bg-emerald-600 border-emerald-600 text-white" : "border-gray-200 text-gray-600"}`}>
                  Wk {w}
                </button>
              ))}
            </div>
          </Field>
          {Object.keys(breaks).length > 0 && (
            <div className="grid sm:grid-cols-2 gap-2">
              {Object.keys(breaks).sort((a, b) => a - b).map((w) => (
                <label key={w} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="w-12 shrink-0">Wk {w}</span>
                  <input value={breaks[w]} onChange={(e) => setBreaks((b) => ({ ...b, [w]: e.target.value }))}
                    placeholder="Half-term" className={inputCls} />
                </label>
              ))}
            </div>
          )}

          <Field label="Notes for the generator" optional>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={600}
              placeholder="For example: rural school with no science lab, 50 learners, prefer group work and local examples."
              className={inputCls} />
          </Field>
        </MoreOptions>

        <p className="text-xs text-gray-500">
          {teachingWeeks} teaching week{teachingWeeks === 1 ? "" : "s"} × {perWeek} = {teachingWeeks * Number(perWeek)} lessons.
        </p>
        <ErrorNote error={error} />
        <SubmitButton busy={busy} disabled={!sel} onClick={submit}>Generate scheme of work</SubmitButton>
        <p className="text-[11px] text-center text-gray-400">Usually under a minute. It keeps building if you leave the page.</p>
      </div>
    </div>
  );
}
