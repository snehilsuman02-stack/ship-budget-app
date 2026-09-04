module.exports = {
    packagerConfig: {
        asar: true
    },

    makers: [
        {
            name: '@electron-forge/maker-squirrel',
            config: {
                name: 'ship_spare_app',
                authors: 'ICGS Vigraha',
                description: 'Ship Spare Management Application'
            }
        }
    ]
};