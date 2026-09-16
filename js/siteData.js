const siteData = {
    contact: {
        phone: "(01) 234 5679",
        phoneLink: "tel:012345679",
        email: "reception@examplehealthcentre.ie",
        emailLink: "mailto:reception@examplehealthcentre.ie",
        address: "123 Main Street, Example Town, Co. Donegal",
        nowDoc: "(01) 987 6543",
        nowDocLink: "tel:019876543"
    },
    hours: {
        weekday: "9:00am - 12:30pm & 2:00pm - 4:30pm",
    },
    pharmacyOptions: {
        "Pharmacy A, Example Town": "Pharmacy A, Example Town",
        "Pharmacy B, Example Town": "Pharmacy B, Example Town",
        "Pharmacy C, Town North": "Pharmacy C, Town North",
        "Pharmacy D, Town South": "Pharmacy D, Town South"
    },
    frequencyOptions: {
        "Once a day": "Once a day",
        "Twice a day": "Twice a day",
        "Three times a day": "Three times a day",
        "Four times a day": "Four times a day",
        "As needed": "As needed"
    }
};

if (typeof window !== 'undefined') {
    window.pharmacyOptions = siteData.pharmacyOptions;
    window.frequencyOptions = siteData.frequencyOptions;
}
