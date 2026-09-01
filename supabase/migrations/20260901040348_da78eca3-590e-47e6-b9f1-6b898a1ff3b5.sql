CREATE TYPE public.app_role AS ENUM ('admin','doctor','assistant');
CREATE TYPE public.case_status AS ENUM ('pending_review','reviewed','referred','closed');
CREATE TYPE public.risk_level AS ENUM ('low','moderate','high');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'doctor'));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "roles read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), COALESCE(NEW.email,''))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'assistant'))
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_code text NOT NULL UNIQUE,
  full_name text NOT NULL,
  age int,
  gender text,
  contact_number text,
  address text,
  district text,
  medical_history text,
  allergies text,
  current_medication text,
  previous_skin_disease text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read patients" ON public.patients FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff insert patients" ON public.patients FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff update patients" ON public.patients FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "admin delete patients" ON public.patients FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER patients_touch BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.screening_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  affected_area text,
  duration text,
  itching_level int NOT NULL DEFAULT 0,
  pain_level int NOT NULL DEFAULT 0,
  redness boolean NOT NULL DEFAULT false,
  swelling boolean NOT NULL DEFAULT false,
  bleeding boolean NOT NULL DEFAULT false,
  discharge boolean NOT NULL DEFAULT false,
  spreading boolean NOT NULL DEFAULT false,
  fever boolean NOT NULL DEFAULT false,
  symptom_description text,
  image_path text,
  predicted_class text,
  risk_level public.risk_level,
  confidence numeric,
  top3_predictions_json jsonb,
  recommendation text,
  doctor_notes text,
  status public.case_status NOT NULL DEFAULT 'pending_review',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.screening_cases TO authenticated;
GRANT ALL ON public.screening_cases TO service_role;
ALTER TABLE public.screening_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read cases" ON public.screening_cases FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff insert cases" ON public.screening_cases FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff update cases" ON public.screening_cases FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "admin delete cases" ON public.screening_cases FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER cases_touch BEFORE UPDATE ON public.screening_cases FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_cases_patient ON public.screening_cases(patient_id);
CREATE INDEX idx_cases_status ON public.screening_cases(status);

CREATE POLICY "staff read lesion images" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'lesion-images' AND public.is_staff(auth.uid()));
CREATE POLICY "staff upload lesion images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lesion-images' AND public.is_staff(auth.uid()));

INSERT INTO public.patients (patient_code, full_name, age, gender, contact_number, address, district, medical_history, allergies, current_medication, previous_skin_disease) VALUES
('PT-1001','Nimal Perera',42,'Male','+94 71 234 5678','12 Temple Road','Colombo','Type 2 diabetes','Penicillin','Metformin 500mg','Fungal infection (2021)'),
('PT-1002','Amara Silva',29,'Female','+94 77 998 1122','48 Lake View','Kandy','None','None','None','Eczema (childhood)'),
('PT-1003','Kasun Fernando',57,'Male','+94 76 555 3311','9 Beach Lane','Galle','Hypertension','Sulfa drugs','Amlodipine 5mg','None'),
('PT-1004','Dilani Jayasuriya',35,'Female','+94 70 445 8899','22 Hill Street','Matara','Asthma','Dust mites','Salbutamol inhaler','Psoriasis (2019)');

INSERT INTO public.screening_cases (patient_id, affected_area, duration, itching_level, pain_level, redness, swelling, bleeding, discharge, spreading, fever, symptom_description, status)
SELECT id,'Left forearm','3 weeks',7,2,true,false,false,false,true,false,'Dry scaly patch that itches badly at night and is slowly spreading.','pending_review' FROM public.patients WHERE patient_code='PT-1001';
INSERT INTO public.screening_cases (patient_id, affected_area, duration, itching_level, pain_level, redness, swelling, bleeding, discharge, spreading, fever, symptom_description, status)
SELECT id,'Upper back','2 months',2,1,false,false,false,false,false,false,'A dark mole that has changed shape and colour over the last month.','pending_review' FROM public.patients WHERE patient_code='PT-1003';
INSERT INTO public.screening_cases (patient_id, affected_area, duration, itching_level, pain_level, redness, swelling, bleeding, discharge, spreading, fever, symptom_description, status)
SELECT id,'Both elbows','6 months',5,3,true,true,false,false,false,false,'Thick red plaques with silvery scale, worse in dry weather.','pending_review' FROM public.patients WHERE patient_code='PT-1004';
INSERT INTO public.screening_cases (patient_id, affected_area, duration, itching_level, pain_level, redness, swelling, bleeding, discharge, spreading, fever, symptom_description, status)
SELECT id,'Right cheek','10 days',3,0,true,false,false,true,false,false,'Small ring-shaped rash with a clearer centre and mild oozing.','pending_review' FROM public.patients WHERE patient_code='PT-1002';