import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CompanyInfo {
  nombre: string
  rfc: string
  telefono: string
  direccion: string
  correo: string
  logoUrl: string   // base64 data URL or ''
}

interface ConfigState {
  company: CompanyInfo
  updateCompany: (data: Partial<CompanyInfo>) => void
}

const DEFAULT_COMPANY: CompanyInfo = {
  nombre:    'InsumosFa',
  rfc:       'IFA210301AB3',
  telefono:  '(81) 8000-1234',
  direccion: 'Av. Industrial 1200, Parque Norte, Monterrey, N.L. C.P. 64720',
  correo:    'ventas@insumosfa.com',
  logoUrl:   '',
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      company: DEFAULT_COMPANY,
      updateCompany(data) {
        set((s) => ({ company: { ...s.company, ...data } }))
      },
    }),
    { name: 'erp_config' }
  )
)
