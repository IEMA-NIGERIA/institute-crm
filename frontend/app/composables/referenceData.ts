import type { IOption } from "./format"

const asOptions = (values: string[]): IOption[] => values.map((value) => ({ value, label: value }))

/** Suggested in free-text sector fields and offered as filters. */
export const SECTOR_OPTIONS = asOptions([
    "Agriculture", "Construction", "Consulting", "Education", "Energy", "Finance", "Healthcare", "Logistics",
    "Manufacturing", "Maritime", "Mining", "Oil & Gas", "Public sector", "Research", "Technology", "Telecoms", "Waste management",
])

export const NIGERIAN_STATE_OPTIONS = asOptions([
    "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi",
    "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
    "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
])
