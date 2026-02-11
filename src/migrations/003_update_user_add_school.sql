alter table users
add column school_level integer default 1,
add column school_option  integer default 1,
add column school_class  integer default 1,
add column school_code char(250) null