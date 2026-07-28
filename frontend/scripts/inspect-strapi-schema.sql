-- PostgreSQL Query for pgAdmin to Inspect Strapi Relationship Tables
-- Use this to verify the correct column names for the profile migration script

-- =============================================================================
-- 1. INSPECT ALL RELATIONSHIP TABLE STRUCTURES
-- =============================================================================

-- Check freelancer category links table structure
SELECT 'freelancers_category_links' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'freelancers_category_links'
ORDER BY ordinal_position;
-- RESULT --
-- "freelancers_category_links"	"id"	"integer"	"NO"
-- "freelancers_category_links"	"freelancer_id"	"integer"	"YES"
-- "freelancers_category_links"	"freelancer_category_id"	"integer"	"YES"
-- "freelancers_category_links"	"freelancer_order"	"double precision"	"YES"

-- Check freelancer subcategory links table structure  
SELECT 'freelancers_subcategory_links' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'freelancers_subcategory_links'
ORDER BY ordinal_position;
-- RESULT --
-- "freelancers_subcategory_links"	"id"	"integer"	"NO"
-- "freelancers_subcategory_links"	"freelancer_id"	"integer"	"YES"
-- "freelancers_subcategory_links"	"freelancer_subcategory_id"	"integer"	"YES"
-- "freelancers_subcategory_links"	"freelancer_order"	"double precision"	"YES"

-- Check freelancer specialization links table structure
SELECT 'freelancers_specialization_links' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'freelancers_specialization_links'
ORDER BY ordinal_position;
-- RESULT --
-- "freelancers_specialization_links"	"id"	"integer"	"NO"
-- "freelancers_specialization_links"	"freelancer_id"	"integer"	"YES"
-- "freelancers_specialization_links"	"skill_id"	"integer"	"YES"
-- "freelancers_specialization_links"	"freelancer_order"	"double precision"	"YES"

-- Check freelancer size links table structure
SELECT 'freelancers_size_links' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'freelancers_size_links'
ORDER BY ordinal_position;
-- RESULT --
-- "freelancers_size_links"	"id"	"integer"	"NO"
-- "freelancers_size_links"	"freelancer_id"	"integer"	"YES"
-- "freelancers_size_links"	"size_id"	"integer"	"YES"
-- "freelancers_size_links"	"freelancer_order"	"double precision"	"YES"

-- Check freelancer min budget links table structure
SELECT 'freelancers_min_budget_links' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'freelancers_min_budget_links'
ORDER BY ordinal_position;
-- RESULT --
-- "freelancers_min_budget_links"	"id"	"integer"	"NO"
-- "freelancers_min_budget_links"	"freelancer_id"	"integer"	"YES"
-- "freelancers_min_budget_links"	"budget_id"	"integer"	"YES"
-- "freelancers_min_budget_links"	"freelancer_order"	"double precision"	"YES"

-- Check skills freelancers links table structure
SELECT 'skills_freelancers_links' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'skills_freelancers_links'
ORDER BY ordinal_position;
-- RESULT --
-- "skills_freelancers_links"	"id"	"integer"	"NO"
-- "skills_freelancers_links"	"skill_id"	"integer"	"YES"
-- "skills_freelancers_links"	"freelancer_id"	"integer"	"YES"
-- "skills_freelancers_links"	"freelancer_order"	"double precision"	"YES"
-- "skills_freelancers_links"	"skill_order"	"double precision"	"YES"

-- Check freelancer contact types links table structure
SELECT 'freelancers_contact_types_links' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'freelancers_contact_types_links'
ORDER BY ordinal_position;
-- RESULT --
-- "freelancers_contact_types_links"	"id"	"integer"	"NO"
-- "freelancers_contact_types_links"	"freelancer_id"	"integer"	"YES"
-- "freelancers_contact_types_links"	"contact_type_id"	"integer"	"YES"
-- "freelancers_contact_types_links"	"contact_type_order"	"double precision"	"YES"
-- "freelancers_contact_types_links"	"freelancer_order"	"double precision"	"YES"

-- Check freelancer payment methods links table structure
SELECT 'freelancers_payment_methods_links' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'freelancers_payment_methods_links'
ORDER BY ordinal_position;
-- RESULT
-- "freelancers_payment_methods_links"	"id"	"integer"	"NO"
-- "freelancers_payment_methods_links"	"freelancer_id"	"integer"	"YES"
-- "freelancers_payment_methods_links"	"payment_method_id"	"integer"	"YES"
-- "freelancers_payment_methods_links"	"payment_method_order"	"double precision"	"YES"
-- "freelancers_payment_methods_links"	"freelancer_order"	"double precision"	"YES"

-- Check freelancer settlement methods links table structure
SELECT 'freelancers_settlement_methods_links' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'freelancers_settlement_methods_links'
ORDER BY ordinal_position;
-- RESULT
-- "freelancers_settlement_methods_links"	"id"	"integer"	"NO"
-- "freelancers_settlement_methods_links"	"freelancer_id"	"integer"	"YES"
-- "freelancers_settlement_methods_links"	"settlement_method_id"	"integer"	"YES"
-- "freelancers_settlement_methods_links"	"settlement_method_order"	"double precision"	"YES"
-- "freelancers_settlement_methods_links"	"freelancer_order"	"double precision"	"YES"

-- Check freelancer industries links table structure
SELECT 'freelancers_industries_links' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'freelancers_industries_links'
ORDER BY ordinal_position;
-- RESULT
-- "freelancers_industries_links"	"id"	"integer"	"NO"
-- "freelancers_industries_links"	"freelancer_id"	"integer"	"YES"
-- "freelancers_industries_links"	"industry_id"	"integer"	"YES"
-- "freelancers_industries_links"	"industry_order"	"double precision"	"YES"
-- "freelancers_industries_links"	"freelancer_order"	"double precision"	"YES"


-- Check freelancer type links table structure
SELECT 'freelancers_type_links' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'freelancers_type_links'
ORDER BY ordinal_position;
-- RESULT
-- "freelancers_type_links"	"id"	"integer"	"NO"
-- "freelancers_type_links"	"freelancer_id"	"integer"	"YES"
-- "freelancers_type_links"	"freelancer_type_id"	"integer"	"YES"
-- "freelancers_type_links"	"freelancer_order"	"double precision"	"YES"

-- =============================================================================
-- 2. SAMPLE DATA FROM EACH TABLE (to see actual values)
-- =============================================================================

-- Sample from category links
SELECT 'freelancers_category_links' as table_name, * 
FROM freelancers_category_links 
LIMIT 5;
"freelancers_category_links"	238	294	7	11
"freelancers_category_links"	283	394	11	3
"freelancers_category_links"	154	209	9	1
"freelancers_category_links"	160	236	9	2
"freelancers_category_links"	170	256	9	3

-- Sample from subcategory links
SELECT 'freelancers_subcategory_links' as table_name, *
FROM freelancers_subcategory_links 
LIMIT 5;
"freelancers_subcategory_links"	266	342	3522	1
"freelancers_subcategory_links"	161	199	3693	1
"freelancers_subcategory_links"	162	201	3671	1
"freelancers_subcategory_links"	163	209	3430	1
"freelancers_subcategory_links"	164	211	3393	1

-- Sample from specialization links
SELECT 'freelancers_specialization_links' as table_name, *
FROM freelancers_specialization_links 
LIMIT 5;
"freelancers_specialization_links"	9	186	233	1
"freelancers_specialization_links"	10	190	70	1
"freelancers_specialization_links"	16	199	567	1
"freelancers_specialization_links"	17	227	443	1
"freelancers_specialization_links"	18	229	583	1

-- Sample from size links
SELECT 'freelancers_size_links' as table_name, *
FROM freelancers_size_links 
LIMIT 5;
"freelancers_size_links"	58	190	2	1
"freelancers_size_links"	59	147	1	1
"freelancers_size_links"	60	227	3	1
"freelancers_size_links"	61	183	2	2
"freelancers_size_links"	62	446	2	3

-- Sample from budget links
SELECT 'freelancers_min_budget_links' as table_name, *
FROM freelancers_min_budget_links 
LIMIT 5;
"freelancers_min_budget_links"	3	190	4	1
"freelancers_min_budget_links"	14	227	4	2
"freelancers_min_budget_links"	1	147	3	1
"freelancers_min_budget_links"	15	183	3	2
"freelancers_min_budget_links"	18	431	3	3

-- Sample from skills links
SELECT 'skills_freelancers_links' as table_name, *
FROM skills_freelancers_links 
LIMIT 5;
"skills_freelancers_links"	92	567	199	1	1
"skills_freelancers_links"	93	443	227	1	1
"skills_freelancers_links"	94	539	227	1	2
"skills_freelancers_links"	95	583	229	1	1
"skills_freelancers_links"	96	584	229	1	2

-- Sample from contact types links
SELECT 'freelancers_contact_types_links' as table_name, *
FROM freelancers_contact_types_links 
LIMIT 5;
"freelancers_contact_types_links"	240	561	1	1	20
"freelancers_contact_types_links"	241	561	2	2	22
"freelancers_contact_types_links"	242	561	3	3	19
"freelancers_contact_types_links"	243	561	5	4	8
"freelancers_contact_types_links"	244	573	1	1	21

-- Sample from payment methods links
SELECT 'freelancers_payment_methods_links' as table_name, *
FROM freelancers_payment_methods_links 
LIMIT 5;
"freelancers_payment_methods_links"	77	155	1	1	1
"freelancers_payment_methods_links"	99	183	1	1	2
"freelancers_payment_methods_links"	101	147	1	1	3
"freelancers_payment_methods_links"	103	190	1	1	4
"freelancers_payment_methods_links"	155	227	1	1	5

-- Sample from settlement methods links
SELECT 'freelancers_settlement_methods_links' as table_name, *
FROM freelancers_settlement_methods_links 
LIMIT 5;
"freelancers_settlement_methods_links"	189	551	1	1	13
"freelancers_settlement_methods_links"	190	551	2	2	14
"freelancers_settlement_methods_links"	194	561	1	1	14
"freelancers_settlement_methods_links"	195	561	2	2	15
"freelancers_settlement_methods_links"	196	561	3	3	5

-- Sample from industries links
SELECT 'freelancers_industries_links' as table_name, *
FROM freelancers_industries_links 
LIMIT 5;
"freelancers_industries_links"	102	431	2	1	2
"freelancers_industries_links"	104	431	9	3	3
"freelancers_industries_links"	105	436	12	1	2
"freelancers_industries_links"	107	436	23	3	1
"freelancers_industries_links"	108	442	10	1	3

-- Sample from type links
SELECT 'freelancers_type_links' as table_name, *
FROM freelancers_type_links 
LIMIT 5;
"freelancers_type_links"	586	609	3	53
"freelancers_type_links"	213	236	1	16
"freelancers_type_links"	588	611	2	53
"freelancers_type_links"	590	613	2	54
"freelancers_type_links"	592	615	1	164

-- =============================================================================
-- 3. COUNT RELATIONSHIPS PER TABLE
-- =============================================================================

-- Count total relationships in each table
SELECT 
    'freelancers_category_links' as table_name,
    COUNT(*) as total_links
FROM freelancers_category_links
UNION ALL
SELECT 
    'freelancers_subcategory_links',
    COUNT(*)
FROM freelancers_subcategory_links
UNION ALL
SELECT 
    'freelancers_specialization_links',
    COUNT(*)
FROM freelancers_specialization_links
UNION ALL
SELECT 
    'freelancers_size_links',
    COUNT(*)
FROM freelancers_size_links
UNION ALL
SELECT 
    'freelancers_min_budget_links',
    COUNT(*)
FROM freelancers_min_budget_links
UNION ALL
SELECT 
    'skills_freelancers_links',
    COUNT(*)
FROM skills_freelancers_links
UNION ALL
SELECT 
    'freelancers_contact_types_links',
    COUNT(*)
FROM freelancers_contact_types_links
UNION ALL
SELECT 
    'freelancers_payment_methods_links',
    COUNT(*)
FROM freelancers_payment_methods_links
UNION ALL
SELECT 
    'freelancers_settlement_methods_links',
    COUNT(*)
FROM freelancers_settlement_methods_links
UNION ALL
SELECT 
    'freelancers_industries_links',
    COUNT(*)
FROM freelancers_industries_links
UNION ALL
SELECT 
    'freelancers_type_links',
    COUNT(*)
FROM freelancers_type_links;
"freelancers_category_links"	165
"freelancers_subcategory_links"	165
"freelancers_specialization_links"	29
"freelancers_size_links"	6
"freelancers_min_budget_links"	15
"skills_freelancers_links"	81
"freelancers_contact_types_links"	111
"freelancers_payment_methods_links"	94
"freelancers_settlement_methods_links"	59
"freelancers_industries_links"	64
"freelancers_type_links"	260

-- =============================================================================
-- 4. TEST THE ACTUAL JOIN QUERY (simplified version)
-- =============================================================================

-- Test a simplified version of the migration query with just a few freelancers
SELECT 
    f.id,
    f.username,
    ft.type as freelancer_type,
    
    -- Test each relationship field one by one
    cat_link.* as category_link_data,
    subcat_link.* as subcategory_link_data,
    spec_link.* as specialization_link_data,
    size_link.* as size_link_data,
    budget_link.* as budget_link_data
    
FROM freelancers f
LEFT JOIN freelancers_type_links ftl ON f.id = ftl.freelancer_id
LEFT JOIN freelancer_types ft ON ftl.freelancer_type_id = ft.id
LEFT JOIN freelancers_category_links cat_link ON f.id = cat_link.freelancer_id
LEFT JOIN freelancers_subcategory_links subcat_link ON f.id = subcat_link.freelancer_id
LEFT JOIN freelancers_specialization_links spec_link ON f.id = spec_link.freelancer_id
LEFT JOIN freelancers_size_links size_link ON f.id = size_link.freelancer_id
LEFT JOIN freelancers_min_budget_links budget_link ON f.id = budget_link.freelancer_id

WHERE f.id IN (SELECT id FROM freelancers LIMIT 3)
ORDER BY f.id;

-- =============================================================================
-- 5. FIND ALL TABLES WITH 'freelancer' IN THE NAME
-- =============================================================================

-- List all tables that contain 'freelancer' in the name
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%freelancer%' 
  AND table_schema = 'public'
ORDER BY table_name;

-- =============================================================================
-- 6. INSPECT FREELANCER COMPONENTS
-- =============================================================================

-- Find all component-related tables
SELECT table_name 
FROM information_schema.tables 
WHERE (table_name LIKE '%component%' OR table_name LIKE '%freelancers_components%')
  AND table_schema = 'public'
ORDER BY table_name;
"components_global_faqs"
"components_global_faqs_components"
"components_global_links"
"components_global_tab_contents"
"components_global_tabs"
"components_global_tabs_components"
"components_global_visibilities"
"components_location_coverages"
"components_location_coverages_area_links"
"components_location_coverages_areas_links"
"components_location_coverages_counties_links"
"components_location_coverages_county_links"
"components_location_coverages_zipcode_links"
"components_location_locations"
"components_location_locations_area_links"
"components_location_locations_county_links"
"components_location_locations_zipcode_links"
"components_notifications_alert_items"
"components_pricing_addons"
"components_pricing_attributes"
"components_pricing_basic_packages"
"components_pricing_basic_packages_components"
"components_pricing_billing_details"
"components_pricing_faqs"
"components_pricing_premium_packages"
"components_pricing_premium_packages_components"
"components_pricing_standard_packages"
"components_pricing_standard_packages_components"
"components_profile_employers"
"components_profile_freelancers"
"components_profile_freelancers_services_links"
"components_rating_stars"
"components_service_types"
"components_shared_meta_socials"
"components_shared_seos"
"components_shared_seos_components"
"components_socials_behances"
"components_socials_dribbbles"
"components_socials_facebooks"
"components_socials_githubs"
"components_socials_instagrams"
"components_socials_likes"
"components_socials_likes_uid_links"
"components_socials_linkedins"
"components_socials_lists"
"components_socials_lists_components"
"components_socials_reactions"
"components_socials_reactions_components"
"components_socials_xes"
"components_socials_you_tubes"
"freelancers_components"
"notifications_components"
"orders_components"
"pages_components"
"services_components"
"up_users_components"
-- Check the freelancers_components table structure
SELECT 'freelancers_components' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'freelancers_components'
ORDER BY ordinal_position;
"freelancers_components"	"id"	"integer"	"NO"
"freelancers_components"	"entity_id"	"integer"	"YES"
"freelancers_components"	"component_id"	"integer"	"YES"
"freelancers_components"	"component_type"	"character varying"	"YES"
"freelancers_components"	"field"	"character varying"	"YES"
"freelancers_components"	"order"	"double precision"	"YES"
-- Sample data from freelancers_components
SELECT * FROM freelancers_components LIMIT 10;
1349	436	351	"location.coverage"	"coverage"	
1352	438	353	"location.coverage"	"coverage"	
1356	439	154	"global.visibility"	"visibility"	
1363	436	156	"global.visibility"	"visibility"	
1232	292	268	"location.coverage"	"coverage"	
1368	442	357	"location.coverage"	"coverage"	
716	188	43	"pricing.billing-details"	"billing_details"	
1370	441	359	"location.coverage"	"coverage"	
719	190	115	"location.coverage"	"coverage"	
725	190	49	"pricing.billing-details"	"billing_details"	
-- Check components_profile_freelancers table structure  
SELECT 'components_profile_freelancers' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'components_profile_freelancers'
ORDER BY ordinal_position;
"components_profile_freelancers"	"id"	"integer"	"NO"
-- Sample data from components_profile_freelancers
SELECT * FROM components_profile_freelancers LIMIT 10;

-- Check if there are other component tables related to freelancers
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE 'components_%'
  AND table_schema = 'public'
ORDER BY table_name;
"components_global_faqs"
"components_global_faqs_components"
"components_global_links"
"components_global_tab_contents"
"components_global_tabs"
"components_global_tabs_components"
"components_global_visibilities"
"components_location_coverages"
"components_location_coverages_area_links"
"components_location_coverages_areas_links"
"components_location_coverages_counties_links"
"components_location_coverages_county_links"
"components_location_coverages_zipcode_links"
"components_location_locations"
"components_location_locations_area_links"
"components_location_locations_county_links"
"components_location_locations_zipcode_links"
"components_notifications_alert_items"
"components_pricing_addons"
"components_pricing_attributes"
"components_pricing_basic_packages"
"components_pricing_basic_packages_components"
"components_pricing_billing_details"
"components_pricing_faqs"
"components_pricing_premium_packages"
"components_pricing_premium_packages_components"
"components_pricing_standard_packages"
"components_pricing_standard_packages_components"
"components_profile_employers"
"components_profile_freelancers"
"components_profile_freelancers_services_links"
"components_rating_stars"
"components_service_types"
"components_shared_meta_socials"
"components_shared_seos"
"components_shared_seos_components"
"components_socials_behances"
"components_socials_dribbbles"
"components_socials_facebooks"
"components_socials_githubs"
"components_socials_instagrams"
"components_socials_likes"
"components_socials_likes_uid_links"
"components_socials_linkedins"
"components_socials_lists"
"components_socials_lists_components"
"components_socials_reactions"
"components_socials_reactions_components"
"components_socials_xes"
"components_socials_you_tubes"
-- =============================================================================
-- 7. ANALYZE COMPONENT RELATIONSHIPS
-- =============================================================================

-- Find all unique component types used by freelancers
SELECT DISTINCT 
    component_type,
    field,
    COUNT(*) as usage_count
FROM freelancers_components 
GROUP BY component_type, field
ORDER BY usage_count DESC;
"location.coverage"	"coverage"	167
"global.visibility"	"visibility"	63
"socials.list"	"socials"	24
"pricing.billing-details"	"billing_details"	7

-- Join freelancers with their components to see the relationship
SELECT 
    f.id as freelancer_id,
    f.username,
    fc.component_type,
    fc.field,
    fc.component_id,
    fc.order as component_order
FROM freelancers f
LEFT JOIN freelancers_components fc ON f.id = fc.entity_id
WHERE f.id IN (SELECT id FROM freelancers ORDER BY id LIMIT 10)
ORDER BY f.id, fc.field, fc.order;
147	"domvournias"	"location.location"	"base"	51	
147	"domvournias"	"pricing.billing-details"	"billing_details"	63	
147	"domvournias"	"location.coverage"	"coverage"	532	
147	"domvournias"	"socials.list"	"socials"	71	
147	"domvournias"	"global.visibility"	"visibility"	149	
149	"testfreelancer"	"location.coverage"	"coverage"	46	
150	"digitalexpert"				
152	"damiuserxr"	"location.coverage"	"coverage"	44	
153	"testcompany"	"location.coverage"	"coverage"	45	
153	"testcompany"	"global.visibility"	"visibility"	44	
154	"damixristis"	"location.coverage"	"coverage"	47	
155	"mastorasz"	"location.coverage"	"coverage"	48	
155	"mastorasz"	"global.visibility"	"visibility"	45	
178	"damuser"				
183	"seoninjas"	"pricing.billing-details"	"billing_details"	36	
183	"seoninjas"	"location.coverage"	"coverage"	199	
183	"seoninjas"	"socials.list"	"socials"	59	
183	"seoninjas"	"global.visibility"	"visibility"	122	
185	"damuser2"				
-- Count freelancers using each component type
SELECT 
    component_type,
    field,
    COUNT(DISTINCT entity_id) as freelancers_using_this,
    COUNT(*) as total_component_instances
FROM freelancers_components
GROUP BY component_type, field
ORDER BY freelancers_using_this DESC;
"location.coverage"	"coverage"	167	167
"global.visibility"	"visibility"	63	63
"socials.list"	"socials"	24	24
"pricing.billing-details"	"billing_details"	7	7

-- =============================================================================
-- 8. DETAILED COMPONENT DATA INSPECTION
-- =============================================================================

-- Inspect Location Coverage components (most used)
SELECT 'components_location_coverages' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'components_location_coverages'
ORDER BY ordinal_position;
"components_location_coverages"	"id"	"integer"	"NO"
"components_location_coverages"	"online"	"boolean"	"YES"
"components_location_coverages"	"onsite"	"boolean"	"YES"
"components_location_coverages"	"onbase"	"boolean"	"YES"
"components_location_coverages"	"address"	"character varying"	"YES"
-- Sample data from location coverage components
SELECT * FROM components_location_coverages 
WHERE id IN (
    SELECT component_id 
    FROM freelancers_components 
    WHERE component_type = 'location.coverage'
    LIMIT 5
);
357	true	true	false	
359	false	true	false	
268	true	false	false	
353	true	false	false	
351	true	false	false	
-- Inspect Global Visibility components
SELECT 'components_global_visibilities' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'components_global_visibilities'
ORDER BY ordinal_position;
"components_global_visibilities"	"id"	"integer"	"NO"
"components_global_visibilities"	"phone"	"boolean"	"YES"
"components_global_visibilities"	"email"	"boolean"	"YES"
"components_global_visibilities"	"address"	"boolean"	"YES"
-- Sample data from visibility components
SELECT * FROM components_global_visibilities 
WHERE id IN (
    SELECT component_id 
    FROM freelancers_components 
    WHERE component_type = 'global.visibility'
    LIMIT 5
);
44	false	false	false
117	true	false	true
45	true	false	false
154	true	false	false
156	true	true	false
-- Inspect Pricing Billing Details components
SELECT 'components_pricing_billing_details' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'components_pricing_billing_details'
ORDER BY ordinal_position;
"components_pricing_billing_details"	"id"	"integer"	"NO"
"components_pricing_billing_details"	"receipt"	"boolean"	"YES"
"components_pricing_billing_details"	"invoice"	"boolean"	"YES"
"components_pricing_billing_details"	"afm"	"bigint"	"YES"
"components_pricing_billing_details"	"doy"	"character varying"	"YES"
"components_pricing_billing_details"	"brand_name"	"character varying"	"YES"
"components_pricing_billing_details"	"profession"	"character varying"	"YES"
"components_pricing_billing_details"	"address"	"character varying"	"YES"
-- Sample data from billing details components
SELECT * FROM components_pricing_billing_details 
WHERE id IN (
    SELECT component_id 
    FROM freelancers_components 
    WHERE component_type = 'pricing.billing-details'
    LIMIT 5
);
60	true	false	123456745	"Doy"	"Eponim"	"Epagg"	"Loikos 45"
49	false	true	157467546	"Θεσσαλονίκης"	"ΔΟΚΙΜΙ ΑΕσ"	"Προγραμματιστής"	"Διεύθυνση 175"
43	false	true	157465483	"Θεσσαλονίκης"	"ΔΟΚΙΜΙ ΑΕσ"	"Προγραμματιστής"	"Διεύθυνση 130"
63	true	false	232344444	"Θεσσαλονίκης"	"ΔΟΚΙΜΙ ΑΕσ"	"Προγραμματιστής"	"Διεύθυνση 1300"
36	true	false					
-- =============================================================================
-- 9. COMPLETE FREELANCER WITH COMPONENTS ANALYSIS
-- =============================================================================

-- Get a complete view of a freelancer with all their components
SELECT 
    f.id,
    f.username,
    f.display_name,
    
    -- Location Coverage data
    clc.id as coverage_id,
    clc.* as coverage_data,
    
    -- Visibility data  
    cgv.id as visibility_id,
    cgv.* as visibility_data,
    
    -- Billing details
    cpbd.id as billing_id,
    cpbd.* as billing_data

FROM freelancers f

-- Join with components
LEFT JOIN freelancers_components fc_coverage ON f.id = fc_coverage.entity_id 
    AND fc_coverage.component_type = 'location.coverage'
LEFT JOIN components_location_coverages clc ON fc_coverage.component_id = clc.id

LEFT JOIN freelancers_components fc_visibility ON f.id = fc_visibility.entity_id 
    AND fc_visibility.component_type = 'global.visibility'  
LEFT JOIN components_global_visibilities cgv ON fc_visibility.component_id = cgv.id

LEFT JOIN freelancers_components fc_billing ON f.id = fc_billing.entity_id 
    AND fc_billing.component_type = 'pricing.billing-details'
LEFT JOIN components_pricing_billing_details cpbd ON fc_billing.component_id = cpbd.id

WHERE f.id IN (SELECT id FROM freelancers ORDER BY id LIMIT 3)
ORDER BY f.id;

-- =============================================================================
-- 10. INSPECT SOCIAL COMPONENTS
-- =============================================================================

-- Inspect Social List components
SELECT 'components_socials_lists' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'components_socials_lists'
ORDER BY ordinal_position;
"components_socials_lists"	"id"	"integer"	"NO"
-- Sample data from social list components
SELECT * FROM components_socials_lists 
WHERE id IN (
    SELECT component_id 
    FROM freelancers_components 
    WHERE component_type = 'socials.list'
    LIMIT 5
);
61
62
60
59
57
"components_profile_freelancers"
"components_profile_freelancers_services_links"
"featured_entities_freelancers_links"
"freelancer_categories"
"freelancer_categories_type_links"
"freelancer_subcategories"
"freelancer_subcategories_category_links"
"freelancer_subcategories_type_links"
"freelancer_types"
"freelancers"
"freelancers_category_links"
"freelancers_components"
"freelancers_contact_types_links"
"freelancers_industries_links"
"freelancers_min_budget_links"
"freelancers_payment_methods_links"
"freelancers_rating_global_links"
"freelancers_saved_by_links"
"freelancers_settlement_methods_links"
"freelancers_size_links"
"freelancers_specialization_links"
"freelancers_status_links"
"freelancers_subcategory_links"
"freelancers_type_links"
"freelancers_user_links"
"freelancers_verification_links"
"locations_freelancers_links"
"notifications_freelancer_links"
"services_freelancer_links"
"skills_freelancers_links"
"testimonials_freelancer_links"
-- =============================================================================
-- INSTRUCTIONS:
-- =============================================================================
-- 1. Connect to your SOURCE database (DigitalOcean) in pgAdmin
-- 2. Run each section separately to inspect the schema
-- 3. Look at the column names in section 1 to see the correct field names
-- 4. Check section 2 for sample data to understand the relationships
-- 5. Use section 4 to test the actual JOIN before running the migration
-- 6. Update the migration script with the correct column names found in section 1