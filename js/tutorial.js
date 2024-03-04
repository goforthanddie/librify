const driver = window.driver.js.driver;

const driverManageGenres = driver({
    animate: false,
    showProgress: false,
    showButtons: ['next', 'previous', 'close'],
    steps: [
        {
            element: '#buttonReduceGenres',
            popover: {
                title: 'Reduce the amount of genres',
                description: 'Imported artists can be linked to multiple genres. This function identifies the genres that contain the most artists and retains only the strongest link for each artist.',
                side: 'bottom',
                align: 'start'
            }
        },
        {
            element: '#buttonClusterGenres',
            popover: {
                title: 'Cluster genres',
                description: 'Click here to cluster genres. For example: You want to include the genres \'classic rock\' and \'hard rock\' into the genre \'rock\'. ',
                side: 'bottom',
                align: 'start'
            }
        }
    ]
});

const driverObj = driver({
    animate: false,
    showProgress: false,
    showButtons: ['next', 'previous', 'close'],
    steps: [
        {
            element: '#buttonUpdateLibrary',
            popover: {
                title: 'Update your library',
                description: 'This function reads your library from Spotify and updates your customized library accordingly. Use this button to initially load your library from Spotify.',
                side: 'bottom',
                align: 'start'
            }
        },
        {
            element: '#buttonManageGenres',
            popover: {
                title: 'Manage your genres',
                description: 'This function allows you to manage the genres of your library.',
                side: 'bottom',
                align: 'start'
            }
        },
        {
            element: '#buttonUndo',
            popover: {
                title: 'Undo last action',
                description: 'Click here to undo changes.',
                side: 'bottom',
                align: 'start'
            }
        },
        {
            element: '#buttonRedo',
            popover: {
                title: 'Redo last undone action',
                description: 'Click here to redo undone changes.',
                side: 'bottom',
                align: 'start'
            }
        },
        {
            element: '#buttonLoadData',
            popover: {
                title: 'Load your library from a file',
                description: 'Click here to import your library from a file.',
                side: 'bottom',
                align: 'start'
            }
        },
        {
            element: '#buttonSaveData',
            popover: {
                title: 'Save your library to a file',
                description: 'Click here to export your library to a file.',
                side: 'bottom',
                align: 'start'
            }
        },
        {
            element: '#selectDevices',
            popover: {
                title: 'Select playback device',
                description: 'Select a playback device from this list to play music to.',
                side: 'bottom',
                align: 'start'
            }
        },
        {
            element: '#buttonReloadDevices',
            popover: {
                title: 'Reload active devices using Spotify',
                description: 'Click here to reload the list of active devices that are currently using your Spotify account.',
                side: 'bottom',
                align: 'start'
            }
        },
        {
            element: '#selectView',
            popover: {
                title: 'Change the library view',
                description: 'Chose between various library views. We got artist-based, genre-based, year-based and a completely customizable view with individual folders.',
                side: 'bottom',
                align: 'start'
            }
        },
        {
            element: '#selectSortAlbums',
            popover: {
                title: 'Change sorting of albums',
                description: 'Chose between year-based and name-based sorting of albums.',
                side: 'bottom',
                align: 'start'
            }
        },
        {
            element: '#searchKeyword',
            popover: {
                title: 'Search your library',
                description: 'Use a keyword to search through your library.',
                side: 'bottom',
                align: 'start'
            }
        },
        {
            element: '#buttonLogout',
            popover: {
                title: 'Logout',
                description: 'Click here to logout.',
                side: 'bottom',
                align: 'start'
            }
        },
        {
            popover: {
                title: 'Happy Coding',
                description: 'And that is all, go ahead and start adding tours to your applications.'
            }
        }
    ]
});