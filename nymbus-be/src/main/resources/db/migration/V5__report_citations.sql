CREATE TABLE report_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES research_reports(id),
  section_key VARCHAR(80) NOT NULL,
  title VARCHAR(250) NOT NULL,
  content_markdown TEXT NOT NULL,
  section_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (report_id, section_order),
  UNIQUE (report_id, section_key)
);
CREATE INDEX ix_sections_report ON report_sections (report_id, section_order);

CREATE TABLE report_section_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_section_id UUID NOT NULL REFERENCES report_sections(id) ON DELETE CASCADE,
  evidence_id UUID NOT NULL REFERENCES evidence(id),
  citation_label VARCHAR(40),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (report_section_id, evidence_id)
);
CREATE INDEX ix_rse_evidence ON report_section_evidence (evidence_id);
CREATE INDEX ix_rse_section ON report_section_evidence (report_section_id);
