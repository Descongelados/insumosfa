import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export interface CompanyInfo {
  nombre: string
  rfc: string
  telefono: string
  direccion: string
  correo: string
  logoUrl: string   // base64 data URL or ''
}

const DEFAULT_COMPANY: CompanyInfo = {
  nombre:    'InsumosFa',
  rfc:       'IFA210301AB3',
  telefono:  '(81) 8000-1234',
  direccion: 'Av. Industrial 1200, Parque Norte, Monterrey, N.L. C.P. 64720',
  correo:    'ventas@insumosfa.com',
  logoUrl:   '',
}

const CONFIG_ID = 'empresa'

interface ConfigState {
  company: CompanyInfo
  loadCompany: () => Promise<void>
  updateCompany: (data: Partial<CompanyInfo>) => Promise<void>
}

export const useConfigStore = create<ConfigState>()((set, get) => ({
  company: DEFAULT_COMPANY,

  async loadCompany() {
    const { data } = await supabase
      .from('erp_config')
      .select('*')
      .eq('id', CONFIG_ID)
      .maybeSingle()

    if (data) {
      set({
        company: {
          nombre:    data.nombre    ?? DEFAULT_COMPANY.nombre,
          rfc:       data.rfc       ?? DEFAULT_COMPANY.rfc,
          telefono:  data.telefono  ?? DEFAULT_COMPANY.telefono,
          direccion: data.direccion ?? DEFAULT_COMPANY.direccion,
          correo:    data.correo    ?? DEFAULT_COMPANY.correo,
          logoUrl:   data.logo_url  ?? DEFAULT_COMPANY.logoUrl,
        },
      })
    }
    // Si la fila no existe aún, se queda con DEFAULT_COMPANY (primera vez)
  },

  async updateCompany(data) {
    // Optimista: actualizar el store inmediatamente
    set(s => ({ company: { ...s.company, ...data } }))

    const current = get().company
    const { error } = await supabase
      .from('erp_config')
      .upsert({
        id:        CONFIG_ID,
        nombre:    current.nombre,
        rfc:       current.rfc,
        telefono:  current.telefono,
        direccion: current.direccion,
        correo:    current.correo,
        logo_url:  current.logoUrl,
      })
    if (error) console.error('updateCompany error:', error.message)
  },
}))
