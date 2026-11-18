"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CurriculumPicker from "@/components/CurriculumPicker";
import { fetchWithAuth } from "@/lib/api";
import {
  API, Field, Select, useGenerate, SubmitButton, ErrorNote, useRemembered,
  inputCls, YEAR, WEEKS, PER_WEEK, TERMS,
} from "@/components/studio/StudioForm";

export default function RecordsPage() {
  const [schemes, setSchemes] = useState(null);
  const [from, setFrom] = useState("");            // scheme id, or "" for blank
  const [sel, setSel] = useState(null);
  const [term, setTerm] = useState("1");
  const [year, setYear] = useState(YEAR);
  const [weeks, setWeeks] = useState("12");
  const [perWeek, setPerWeek] = useState("5");
  const [school, setSchool] = useRemembered("school");
  const [teacher, setTeacher] = useRemembered("teacher");
  const [tsc, setTsc] = useRemembered("tsc");
  const [className, setClassName] = useState("");
  const [startDate, setStartDate] = useState("");
  const { run, busy, error } = useGenerate("/facilitator/records/");

  useEffect(() => {
    fetchWithAuth(`${API}/facilitator/library/?tool=scheme_of_work`)
      .then((r) => r.json())
      .then((d) => {
        const ready = (d.results || []).filter((s) => s.status === "ready");
        setSchemes(ready);
        if (ready.length) setFrom(String(ready[0].id));
      })
      .catch(() => setSchemes([]));
  }, []);

  const meta = { school, teacher, tsc_number: tsc, class_name: className, start_date: startDate };
  const submit = () =>
    run(from
      ? { scheme_id: from, ...meta }
      : { grade: sel.grade, subject: sel.subjectId, strands: sel.strandIds, term, year, weeks,
          lessons_per_week: perWeek, ...meta });

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">Records of Work</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">
        Log what you taught each week, in the format heads of department and QASOs check. Lessons you don&apos;t get to
        carry over to the next week by themselves.
      </p>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 space-y-5">
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">Start from</p>
          <div className="space-y-2">
            {(schemes || []).map((s) => (
              <label key={s.id} className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer ${from === String(s.id) ? "border-emerald-500 bg-emerald-50/60" : "border-gray-200"}`}>
                <input type="radio" checked={from === String(s.id)} onChange={() => setFrom(String(s.id))} className="mt-1 accent-emerald-600" />
                <span>
                  <span className="block text-sm font-semibold text-gray-900">{s.title}</span>
                  <span className="block text-xs text-gray-500">Scheme of work · made {new Date(s.created_at).toLocaleDateString()}</span>
                </span>
              </label>
            ))}
            <label className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer ${from === "" ? "border-emerald-500 bg-emerald-50/60" : "border-gray-200"}`}>
              <input type="radio" checked={from === ""} onChange={() => setFrom("")} className="mt-1 accent-emerald-600" />
              <span>
                <span className="block text-sm font-semibold text-gray-900">From the curriculum</span>
                <span className="block text-xs text-gray-500">No scheme? Pick the class and term; the weeks are laid out from the KICD design.</span>
              </span>
            </label>
            {schemes && schemes.length === 0 && (
              <Link href="/facilitator/schemes" className="inline-block text-xs font-semibold text-emerald-700 hover:underline">
                Make a scheme of work first
              </Link>
            )}
          </div>
        </div>

        {from === "" && (
          <>
            <CurriculumPicker onSelect={setSel} wholeSubject />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Term"><Select value={term} onChange={setTerm} options={TERMS} /></Field>
              <Field label="Year"><input value={year} onChange={(e) => setYear(e.target.value)} className={inputCls} /></Field>
              <Field label="Weeks in the term"><Select value={weeks} onChange={setWeeks} options={WEEKS} /></Field>
              <Field label="Lessons per week"><Select value={perWeek} onChange={setPerWeek} options={PER_WEEK} /></Field>
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="School" optional><input value={school} onChange={(e) => setSchool(e.target.value)} className={inputCls} /></Field>
          <Field label="Teacher's name" optional><input value={teacher} onChange={(e) => setTeacher(e.target.value)} className={inputCls} /></Field>
          <Field label="TSC number" optional><input value={tsc} onChange={(e) => setTsc(e.target.value)} className={inputCls} /></Field>
          <Field label="Class or stream" optional><input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="For example: 7 East" className={inputCls} /></Field>
          <Field label="Monday of the first week" optional className="col-span-2" hint="Each week then shows its dates, and the record opens on the current week.">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
          </Field>
        </div>

        <ErrorNote error={error} />
        <SubmitButton busy={busy} disabled={from === "" && !sel} onClick={submit} busyText="Creating...">
          Create record of work
        </SubmitButton>
        <p className="text-[11px] text-center text-gray-400">You do this once a term. After that, come back each week to tick off what you taught.</p>
      </div>
    </div>
  );
}
