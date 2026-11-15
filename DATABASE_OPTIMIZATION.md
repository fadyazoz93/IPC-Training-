# مواصفات التصميم المعماري لتحسين استهلاك قاعدة البيانات وضمان الترشيد (Database Optimization & Architecture Guidelines)

**الهدف:** منع الاستنزاف المفرط للقراءات السحابية (Row Reads Exhaustion) وضمان بقاء التطبيق ضمن الحدود المجانية المستقرة لقواعد البيانات السحابية (مثل Turso و SQLite و LibSQL).

---

## 1. تصميم مخطط قاعدة البيانات (Schema & Indexing Architecture)
* **الفهارس الإلزامية (Mandatory Indexing):**
  يُحظر إنشاء أي جدول دون تعريف فهارس (`INDEX`) مسبقة على جميع الأعمدة المستخدمة في عمليات التصفية (`WHERE`)، الترتيب (`ORDER BY`)، وحقول الربط (`JOIN`) والمفاتيح الخارجية (`Foreign Keys`).
  - جدول `Training_Employees`:
    - `idx_emp_category` على العمود `(Category)`
    - `idx_emp_name` على العمود `(Name)`
  - جدول `Training_TrainingLogs`:
    - `idx_logs_date` على العمود `(Date)`
    - `idx_logs_year_month` على الأعمدة `(Year, Month)`
    - `idx_logs_category` على العمود `(Category)`
    - `idx_logs_trainer` على العمود `(Trainer)`
    - `idx_logs_trainee` على العمود `(TraineeName)`
    - `idx_logs_session` على الأعمدة `(Date, Category, Policies, Trainer)`
  - جدول `Training_Settings`:
    - `idx_settings_type` على العمود `(Type)`
  - جدول `Training_TrainingPlan`:
    - `idx_plan_lookup` على الأعمدة `(Year, Month, Category)`
    - `idx_plan_year` على العمود `(Year)`
* **منع المسح الكامل للجداول (No Full Table Scans):**
  يجب أن تُصمم جميع الاستعلامات لتعتمد على الفهارس حصراً لضمان أن الاستعلام يقرأ فقط السجلات المعنية بدقة بدلاً من فحص آلاف السجلات.

---

## 2. معمارية طبقة التخزين المؤقت (In-Memory Cache-Aside Pattern)
* **عزل الاستدعاء المباشر:**
  يُمنع الاتصال المباشر بقاعدة البيانات عند كل طلب مستخدم أو دورة معالجة.
* **دورة عمل القراءة:**
  1. يفحص التطبيق الذاكرة العشوائية (`In-Memory Cache`) أولاً.
  2. إذا كانت البيانات متوفرة وصالحة، تُعاد فوراً للمستخدم باستهلاك (**0 قراءات سحابية - Zero Row Reads**).
  3. عند فقدان الكاش (`Cache Miss`)، يتم طلب البيانات من السحابة وتخزينها في الذاكرة مع تعيين وقت انتهاء صلاحية محدد (`TTL = 5 minutes`) يتناسب مع نوع البيانات.

---

## 3. هيكلة الاستعلامات وضوابط الجلب (Query Optimization & Governance)
* **حظر الجلب العشوائي:**
  يُمنع منعاً باتاً استخدام `SELECT *`. يجب تحديد أسماء الحقول المطلوبة للعملية فقط في نص الاستعلام:
  - `SELECT ID, Name, Job, Category FROM Training_Employees;`
  - `SELECT ID, Date, Month, Year, Category, Policies, TraineeName, Trainer, Timestamp FROM Training_TrainingLogs;`
  - `SELECT Type, Value FROM Training_Settings;`
  - `SELECT id, Month, Category, Policies, Year FROM Training_TrainingPlan;`
* **تقييد النتائج والصفحات (Pagination & Limits):**
  يجب أن تحتوي جميع استعلامات القراءة على سقف محدد للنتائج (`LIMIT`) عند الحاجة، مع دعم نظام الترقيم لمنع تحميل كتل بيانات ضخمة دفعة واحدة.

---

## 4. سياسة الاتصال والمزامنة (Event-Driven vs. Polling Control)
* **منع الفحص الحلقي السريع (No Rapid Polling):**
  يُحظر نهائياً عمل حلقات تكرار (`Loops / Intervals`) تستعلم من قاعدة البيانات بفواصل زمنية تقل عن 60 ثانية.
* **الاعتماد على الأحداث:**
  يُصمم تدفق التحديثات بالاعتماد على الأحداث اللحظية أو إشارات العمليات (`User Mutations / Actions`) بدلاً من توجيه طلبات استعلام متكررة للسحابة للتأكد من وجود بيانات جديدة.

---

## 5. التحديث المتفائل ومزامنة الحالة (Optimistic Updates & Local Mutation)
* **منع إعادة القراءة بعد الكتابة:**
  عند تنفيذ عمليات الإدخال أو التعديل (`INSERT` / `UPDATE` / `DELETE`)، يجب تحديث الذاكرة المحلية (`Cache`) وحالة واجهة المستخدم مباشرة بالقيم الجديدة، دون تنفيذ استعلام `SELECT` لاحق للتأكد من وصول البيانات، مما يوفر آلاف القراءات شهرياً.
