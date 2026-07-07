CREATE TABLE "Colegio".access_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES "Colegio".profiles(id)
);

ALTER TABLE "Colegio".access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cualquiera puede insertar solicitudes"
  ON "Colegio".access_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Autenticados pueden leer solicitudes"
  ON "Colegio".access_requests
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Autenticados pueden actualizar solicitudes"
  ON "Colegio".access_requests
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
