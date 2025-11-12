"use client"


import { useState, useEffect } from "react"
import Topbar from "@/components/topbar"
import StakeholderToolbar from "@/components/stakeholder-management/stakeholder-management-toolbar"
import StakeholderTable from "@/components/stakeholder-management/stakeholder-management-table"
import AddStakeholderModal from "@/components/stakeholder-management/add-stakeholder-modal"
import QuickFilterModal from "@/components/stakeholder-management/quick-filter-modal"
import EditStakeholderModal from "@/components/stakeholder-management/stakeholder-edit-modal"
import DeleteStakeholderModal from "@/components/stakeholder-management/delete-stakeholder-modal"
import { getUserInfo } from '../../../utils/getUserInfo'


interface StakeholderFormData {
	firstName: string
	middleName?: string
	lastName: string
	stakeholderName?: string
	stakeholderEmail: string
	contactNumber: string
	password: string
	retypePassword: string
	province: string
	district: string
	districtId?: string
}



export default function StakeholderManagement() {
	const [searchQuery, setSearchQuery] = useState("")
	const [selectedStakeholders, setSelectedStakeholders] = useState<string[]>([])
	const [isAddModalOpen, setIsAddModalOpen] = useState(false)
	const [isCreating, setIsCreating] = useState(false)
	const [stakeholders, setStakeholders] = useState<any[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [isEditModalOpen, setIsEditModalOpen] = useState(false)
	const [filters, setFilters] = useState<{ province?: string; districtId?: string }>({})
	const [openQuickFilter, setOpenQuickFilter] = useState(false)
	const [editingStakeholder, setEditingStakeholder] = useState<any | null>(null)
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
	const [deletingStakeholder, setDeletingStakeholder] = useState<{ id: string; name: string } | null>(null)
    // map of District_ID -> district object to resolve province and formatted district
    const [districtsMap, setDistrictsMap] = useState<Record<string, any> | null>(null)

		// Do not call getUserInfo() synchronously — read it on mount so server and client
		// produce the same initial HTML; update user-derived state after hydration.
		const [userInfo, setUserInfo] = useState<any | null>(null)
		const [displayName, setDisplayName] = useState('Bicol Medical Center')
		const [displayEmail, setDisplayEmail] = useState('bmc@gmail.com')
		const [canManageStakeholders, setCanManageStakeholders] = useState(false)

		useEffect(() => {
			try {
				const info = getUserInfo()
				setUserInfo(info)
				const rawUser = info?.raw || null
				const staffType = rawUser?.StaffType || rawUser?.Staff_Type || rawUser?.staff_type || rawUser?.staffType || (rawUser?.user && (rawUser.user.StaffType || rawUser.user.staff_type || rawUser.user.staffType)) || null
				const isStaffAdmin = !!staffType && String(staffType).toLowerCase() === 'admin'
				const resolvedRole = info?.role || null
				const roleLower = resolvedRole ? String(resolvedRole).toLowerCase() : ''
				const isSystemAdmin = !!info?.isAdmin || (roleLower.includes('sys') && roleLower.includes('admin'))
				setCanManageStakeholders(!!(isStaffAdmin && (isSystemAdmin || roleLower === 'admin')))
				setDisplayName(info?.displayName || 'Bicol Medical Center')
				setDisplayEmail(info?.email || 'bmc@gmail.com')
			} catch (e) { /* ignore */ }
		}, [])

			// Load districts once so we can resolve District_ID -> friendly names and province
			useEffect(() => {
				const loadDistricts = async () => {
					try {
						const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
						const url = base ? `${base}/api/districts?limit=1000` : `/api/districts?limit=1000`
						const token = (typeof window !== 'undefined') ? (localStorage.getItem('unite_token') || sessionStorage.getItem('unite_token')) : null
						const headers: any = {}
						if (token) headers['Authorization'] = `Bearer ${token}`
						const res = await fetch(url, { headers })
						const text = await res.text()
						const json = text ? JSON.parse(text) : null
						if (!res.ok) return
						const items = json.data || []
						const map: Record<string, any> = {}
						for (const d of items) {
							if (d.District_ID) map[String(d.District_ID)] = d
						}
						setDistrictsMap(map)
					} catch (e) {
						// ignore district load errors
					}
				}
				loadDistricts()
			}, [])


	const handleSearch = (query: string) => {
		setSearchQuery(query)
	}


	const handleUserClick = () => {
		console.log("User profile clicked")
	}


	const handleExport = () => {
		console.log("Exporting data...")
	}


	const handleQuickFilter = () => {
		setOpenQuickFilter(true)
	}


	const handleAdvancedFilter = () => {
		console.log("Opening advanced filter...")
	}


	const handleAddStakeholder = () => {
		setIsAddModalOpen(true)
	}


	const handleModalClose = () => {
		setIsAddModalOpen(false)
	}


	const handleModalSubmit = async (data: any) => {
		console.log("New stakeholder data:", data)
		setIsCreating(true)
		try {
			const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
			// get logged-in admin id and token
			let rawUser = null
			try { rawUser = localStorage.getItem('unite_user') } catch (e) { rawUser = null }
			const user = rawUser ? JSON.parse(rawUser) : null
			const token = (typeof window !== 'undefined') ? (localStorage.getItem('unite_token') || sessionStorage.getItem('unite_token')) : null
			const adminId = user?.id || user?.ID || user?.Staff_ID || user?.StaffId || user?.Admin_ID || user?.adminId || null
			if (!adminId) throw new Error('Logged-in admin id not found')

			const url = base ? `${base}/api/admin/${encodeURIComponent(adminId)}/stakeholders` : `/api/admin/${encodeURIComponent(adminId)}/stakeholders`

			// The backend expects stakeholder data in body (see stakeholder.service.register)
			// Stakeholder creation payload - keep shape similar to backend stakeholder.register
			const body = {
				First_Name: data.firstName,
				Middle_Name: data.middleName || null,
				Last_Name: data.lastName,
				Email: data.stakeholderEmail,
				Phone_Number: data.contactNumber,
				Password: data.password,
				Province_Name: data.province,
				District_ID: data.districtId || data.district,
				createdByAdminId: adminId
			}

			const headers: any = { 'Content-Type': 'application/json' }
			if (token) headers['Authorization'] = `Bearer ${token}`

			const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
			const text = await res.text()
			let json: any = null
			try { json = text ? JSON.parse(text) : null } catch (err) { throw new Error(`Invalid JSON response when creating stakeholder: ${text.slice(0,200)}`) }
			if (!res.ok) throw new Error(json?.message || `Failed to create stakeholder (status ${res.status})`)

			// success: refresh stakeholders list
			await (async () => {
				// reuse fetchStakeholders logic: crudely re-run the effect by calling internal fetch
				setLoading(true)
				setError(null)
				try {
					// refresh list of stakeholders using same fetch logic used elsewhere
					await fetchStakeholders()
				} catch (e) {
					// ignore refresh errors
				} finally { setLoading(false) }
			})()

			setIsAddModalOpen(false)
		} catch (err: any) {
			alert(err?.message || 'Failed to create stakeholder')
			console.error(err)
		} finally {
			setIsCreating(false)
		}
	}


	const handleSelectAll = (checked: boolean) => {
		if (checked) {
			setSelectedStakeholders(stakeholders.map((c) => c.id))
		} else {
			setSelectedStakeholders([])
		}
	}


	const handleSelectStakeholder = (id: string, checked: boolean) => {
		if (checked) {
			setSelectedStakeholders([...selectedStakeholders, id])
		} else {
			setSelectedStakeholders(selectedStakeholders.filter((cId) => cId !== id))
		}
	}


	const handleActionClick = (id: string) => {
		// action handler
	}

	const handleUpdateStakeholder = (id: string) => {
		// fetch stakeholder details and open edit modal
		(async () => {
			try {
				setLoading(true)
				const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
				const url = base ? `${base}/api/stakeholders/${encodeURIComponent(id)}` : `/api/stakeholders/${encodeURIComponent(id)}`
				const token = (typeof window !== 'undefined') ? (localStorage.getItem('unite_token') || sessionStorage.getItem('unite_token')) : null
				const headers: any = { 'Content-Type': 'application/json' }
				if (token) headers['Authorization'] = `Bearer ${token}`
				const res = await fetch(url, { headers })
				const text = await res.text()
				const json = text ? JSON.parse(text) : null
				if (!res.ok) throw new Error(json?.message || `Failed to fetch stakeholder (status ${res.status})`)
				const data = json.data || json.stakeholder || json || null
				setEditingStakeholder(data)
				setIsEditModalOpen(true)
			} catch (e: any) {
				alert(e?.message || 'Failed to load stakeholder')
			} finally {
				setLoading(false)
			}
		})()
	}

	// Instead of immediate delete, show confirm modal that requires typing full name
	const handleDeleteStakeholder = (id: string, name?: string) => {
		if (!canManageStakeholders) {
			alert('Only system administrators with StaffType=Admin can delete stakeholders')
			return
		}
		setDeletingStakeholder({ id, name: name || '' })
		setIsDeleteModalOpen(true)
	}

	const confirmDeleteStakeholder = async (id: string) => {
		try {
			setLoading(true)
			const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
			const url = base ? `${base}/api/stakeholders/${encodeURIComponent(id)}` : `/api/stakeholders/${encodeURIComponent(id)}`
			const token = (typeof window !== 'undefined') ? (localStorage.getItem('unite_token') || sessionStorage.getItem('unite_token')) : null
			const headers: any = { 'Content-Type': 'application/json' }
			if (token) headers['Authorization'] = `Bearer ${token}`
			const res = await fetch(url, { method: 'DELETE', headers })
			const text = await res.text()
			const json = text ? JSON.parse(text) : null
			if (!res.ok) throw new Error(json?.message || `Failed to delete stakeholder (status ${res.status})`)

			// refresh list
			await fetchStakeholders()
		} catch (err: any) {
			throw err
		} finally {
			setLoading(false)
		}
	}


// Fetch stakeholders from backend and normalize shape for the table
	const fetchStakeholders = async (appliedFilters?: { province?: string; districtId?: string }) => {
		const ordinalSuffix = (n: number | string) => {
			const num = Number(n)
			if (Number.isNaN(num)) return String(n)
			const j = num % 10,
				k = num % 100
			if (j === 1 && k !== 11) return `${num}st`
			if (j === 2 && k !== 12) return `${num}nd`
			if (j === 3 && k !== 13) return `${num}rd`
			return `${num}th`
		}

		const formatDistrict = (districtObj: any) => {
			if (!districtObj) return ""
			if (districtObj.District_Number) return `${ordinalSuffix(districtObj.District_Number)} District`
			if (districtObj.District_Name) return districtObj.District_Name
			return ""
		}

		setLoading(true)
		setError(null)
		try {
			// Use NEXT_PUBLIC_API_URL from .env.local (inlined at build time)
			const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
		// get logged-in user and token from local/session storage
		let rawUser = null
		try { rawUser = localStorage.getItem('unite_user'); } catch (e) { rawUser = null }
		const user = rawUser ? JSON.parse(rawUser) : null
		const token = (typeof window !== 'undefined') ? (localStorage.getItem('unite_token') || sessionStorage.getItem('unite_token')) : null

	// choose admin-managed endpoint only when the logged-in user is BOTH a system admin and has StaffType 'Admin'
	const adminId = user?.id || user?.ID || user?.Staff_ID || user?.StaffId || user?.Admin_ID || user?.adminId || null
	const fetchIsSystemAdmin = !!userInfo?.isAdmin
	const fetchRaw = user || null
	const fetchStaffType = fetchRaw?.StaffType || fetchRaw?.Staff_Type || fetchRaw?.staff_type || fetchRaw?.staffType || (fetchRaw?.user && (fetchRaw.user.StaffType || fetchRaw.user.staff_type || fetchRaw.user.staffType)) || null
	const fetchIsStaffAdmin = !!fetchStaffType && String(fetchStaffType).toLowerCase() === 'admin'
	const useAdminEndpoint = !!(fetchIsSystemAdmin && fetchIsStaffAdmin && adminId)
	// detect if the user is a coordinator so we limit results to their district
	const fetchIsCoordinator = !!fetchStaffType && String(fetchStaffType).toLowerCase() === 'coordinator'
	// attempt to read user's district id
	const userDistrictId = user?.District_ID || user?.DistrictId || user?.districtId || (user?.District && (user.District.District_ID || user.District.District_Number)) || (userInfo?.raw && (userInfo.raw.District_ID || userInfo.raw.DistrictId || userInfo.raw.districtId)) || null

			// attach filters as query params when present
			const params = new URLSearchParams()
			params.set('limit', '1000')
			const af = appliedFilters || filters || {}
			// If the logged-in user is a coordinator, restrict to their district unless an explicit filter is applied
			if (af.districtId) params.set('districtId', String(af.districtId))
			else if (fetchIsCoordinator && userDistrictId) params.set('districtId', String(userDistrictId))
			if (af.province) params.set('province', String(af.province))

			const url = base
				? (useAdminEndpoint ? `${base}/api/admin/${encodeURIComponent(adminId)}/stakeholders?${params.toString()}` : `${base}/api/stakeholders?${params.toString()}`)
				: (useAdminEndpoint ? `/api/admin/${encodeURIComponent(adminId)}/stakeholders?${params.toString()}` : `/api/stakeholders?${params.toString()}`)

			const headers: any = {}
			if (token) headers['Authorization'] = `Bearer ${token}`
			const res = await fetch(url, { headers })

			// Read as text first to avoid JSON parse errors when the server returns HTML (like a 404 page)
			const text = await res.text()
			let json: any = null
			try {
				json = text ? JSON.parse(text) : null
			} catch (parseErr) {
				// If response is not valid JSON, include a short snippet in the error to help debugging
				const snippet = text.slice(0, 300)
				throw new Error(`Invalid JSON response (status ${res.status}): ${snippet}`)
			}

			if (!res.ok) throw new Error(json?.message || `Failed to fetch stakeholders (status ${res.status})`)

			// backend stakeholder list returns items with First_Name, Middle_Name, Last_Name, Email, Phone_Number, Province_Name, District_ID or District_Name
			const items = json.data || json.stakeholders || []
			const mapped = items.map((s: any) => {
				const fullName = [s.First_Name, s.Middle_Name, s.Last_Name].filter(Boolean).join(' ')
				// Prefer a populated District object when available
				let districtObj = s.District || (s.District_Details || null)
				// If not populated, try to resolve from prefetched districtsMap using District_ID
				if (!districtObj && districtsMap && (s.District_ID || s.DistrictId)) {
					districtObj = districtsMap[String(s.District_ID || s.DistrictId)] || null
				}
				const province = s.Province_Name || (districtObj && (districtObj.Province_Name || districtObj.ProvinceName)) || ''
				let districtDisplay = ''
				if (districtObj) {
					districtDisplay = formatDistrict(districtObj)
				} else if (s.District_Name) {
					districtDisplay = s.District_Name
				} else if (s.District_ID) {
					// fallback: try to infer number from District_ID like CSUR-001 -> 1
					const m = String(s.District_ID).match(/(\d+)$/)
					if (m) {
						const num = Number(m[1])
						if (!Number.isNaN(num)) districtDisplay = `${ordinalSuffix(num)} District`
					} else {
						districtDisplay = String(s.District_ID)
					}
				}

				return {
					id: s.Stakeholder_ID || s.id || '',
					name: fullName,
					email: s.Email || '',
					phone: s.Phone_Number || '',
					organization: s.Organization_Institution || s.Organization || s.Organization_Institution || '',
					district: districtDisplay
				}
			})

			setStakeholders(mapped)
		} catch (err: any) {
			setError(err.message || 'Unknown error')
		} finally {
			setLoading(false)
		}
	}

		// If we prefetch districts after the initial load, re-run stakeholder fetch so
		// province/district can be resolved from the districtsMap.
		useEffect(() => {
		    if (districtsMap) {
		        // re-fetch to pick up province names from districtsMap when available
		        fetchStakeholders()
		    }
		}, [districtsMap])

		useEffect(() => { fetchStakeholders() }, [])


	return (
		<div className="min-h-screen bg-white">
			{/* Page Header */}
			<div className="px-6 pt-6 pb-4">
				<h1 className="text-2xl font-semibold text-gray-900">Stakeholder Management</h1>
			</div>


			{/* Topbar Component */}
			<Topbar
				userName={displayName}
				userEmail={displayEmail}
				onUserClick={handleUserClick}
			/>


			{/* Toolbar with Search and Actions */}
			<StakeholderToolbar
				onExport={handleExport}
				onAdvancedFilter={handleAdvancedFilter}
				onQuickFilter={handleQuickFilter}
				onAddCoordinator={handleAddStakeholder}
				onSearch={handleSearch}
			/>


			{/* Table Content */}
			<div className="px-6 py-4 bg-gray-50">
				{loading && <p className="text-sm text-gray-500">Loading stakeholders...</p>}
				{error && <p className="text-sm text-red-500">{error}</p>}
				<StakeholderTable
					coordinators={stakeholders}
					selectedCoordinators={selectedStakeholders}
					onSelectAll={handleSelectAll}
					onSelectCoordinator={handleSelectStakeholder}
					onActionClick={handleActionClick}
					onUpdateCoordinator={handleUpdateStakeholder}
					onDeleteCoordinator={handleDeleteStakeholder}
					searchQuery={searchQuery}
					// Pass true only when user is both a system admin and has StaffType='Admin'
					isAdmin={canManageStakeholders}
				/>
			</div>


			{/* Add Stakeholder Modal */}
			<AddStakeholderModal
				isOpen={isAddModalOpen}
				onClose={handleModalClose}
				onSubmit={handleModalSubmit}
			/>
			<DeleteStakeholderModal
				isOpen={isDeleteModalOpen}
				onClose={() => { setIsDeleteModalOpen(false); setDeletingStakeholder(null); }}
				coordinatorId={deletingStakeholder?.id || null}
				coordinatorName={deletingStakeholder?.name || null}
				onConfirmDelete={async (id: string) => { await confirmDeleteStakeholder(id); setIsDeleteModalOpen(false); setDeletingStakeholder(null); }}
			/>
			{/* Edit Stakeholder Modal */}
			<EditStakeholderModal
				isOpen={isEditModalOpen}
				onClose={() => { setIsEditModalOpen(false); setEditingStakeholder(null); }}
				coordinator={editingStakeholder}
				onSaved={async () => { await fetchStakeholders(); setIsEditModalOpen(false); setEditingStakeholder(null); }}
			/>

			<QuickFilterModal
				isOpen={openQuickFilter}
				onClose={() => setOpenQuickFilter(false)}
				onApply={(f) => {
					setFilters(f)
					setOpenQuickFilter(false)
					fetchStakeholders(f)
				}}
			/>
		</div>
	)
}

