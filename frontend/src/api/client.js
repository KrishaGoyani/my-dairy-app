import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

export const getCustomers = (params) => api.get('/customers', { params })
export const getCustomer = (id) => api.get(`/customers/${id}`)
export const createCustomer = (data) => api.post('/customers', data)
export const updateCustomer = (id, data) => api.patch(`/customers/${id}`, data)
export const deleteCustomer = (id) => api.delete(`/customers/${id}`)

export const getRates = () => api.get('/rates')
export const updateRate = (id, data) => api.patch(`/rates/${id}`, data)
export const updateRatesBulk = (data) => api.put('/rates/bulk', data)

export const saveDeliverySession = (data) => api.post('/deliveries/session', data)
export const getDeliverySession = (customerId, date, session) =>
  api.get('/deliveries/session', {
    params: { customer_id: customerId, date, session },
  })
export const getGroupedDeliveries = (customerId, year, month) =>
  api.get('/deliveries/grouped', {
    params: { customer_id: customerId, year, month },
  })

export const createPayment = (data) => api.post('/payments', data)
export const getPayments = (customerId, year, month) =>
  api.get('/payments', { params: { customer_id: customerId, year, month } })

export const getDashboard = ({
  date_from,
  date_to,
  group_by = 'day',
}) =>
  api.get('/dashboard', { params: { date_from, date_to, group_by } })

export const getDashboardToday = (date) =>
  api.get('/dashboard/today', { params: date ? { date } : {} })

export const getBill = (customerId, year, month) =>
  api.get('/bills', { params: { customer_id: customerId, year, month } })

export const getReport = ({
  date_from,
  date_to,
  group_by = 'day',
  search = '',
  page = 1,
  page_size = 10,
}) =>
  api.get('/reports', {
    params: { date_from, date_to, group_by, search, page, page_size },
  })

export const getDailyReport = ({ date, search = '', page = 1, page_size = 10 }) =>
  api.get('/reports/daily', { params: { date, search, page, page_size } })

export const getMonthlyReport = ({
  year,
  month,
  search = '',
  page = 1,
  page_size = 10,
}) =>
  api.get('/reports/monthly', { params: { year, month, search, page, page_size } })

export default api
