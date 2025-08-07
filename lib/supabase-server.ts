import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from './supabase'

export const createServerClient = () => createServerComponentClient<Database>({ cookies })