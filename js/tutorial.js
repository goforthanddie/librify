function openContextmenu() {
    // get root node from tree
    let elRoot= document.getElementById('root');
    let rectRoot= elRoot.getBoundingClientRect();
    // event to trigger contextmenu
    let e = new Event('contextmenu');
    e.pageX = rectRoot.right;
    e.pageY = rectRoot.bottom;
    elRoot.dispatchEvent(e);
}

const driver = window.driver.js.driver;
const driverObj = driver({
    animate: true,
    showProgress: false,
    showButtons: ['next', 'previous', 'close'],
    steps: [
        {
            element: '#buttonUpdateLibrary',
            popover: {
                title: 'Update your library',
                description: 'This function reads your library from Spotify and updates your customized library when new albums have been added on Spotify.',
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
                align: 'start',
                onNextClick: () => {
                    $('#viewManageGenres').show();
                    driverObj.moveNext();
                }
            }
        },
        {
            element: '#buttonReduceGenres',
            popover: {
                title: 'Reduce the amount of genres',
                description: 'Artists can be linked to multiple genres. This function identifies the genres that contain the most artists and retains only the link to the largest genre for each artist.',
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
        },
        {
            element: '#buttonRemoveEmptyGenres',
            popover: {
                title: 'Remove empty genres',
                description: 'Click here to remove empty genres from the library.',
                side: 'bottom',
                align: 'start',
                onNextClick: () => {
                    $('#viewManageGenres').hide();
                    driverObj.moveNext();
                }
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
                description: 'Click here to import your customized library from a file.',
                side: 'bottom',
                align: 'start'
            }
        },
        {
            element: '#buttonSaveData',
            popover: {
                title: 'Save your library to a file',
                description: 'Click here to export your customized library to a file.',
                side: 'bottom',
                align: 'start'
            }
        },
        {
            element: '#viewStatus',
            popover: {
                title: 'Status display',
                description: 'Status messages are displayed here.',
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
                title: 'Reload active devices',
                description: 'Click here to reload the list of active devices that are currently using your Spotify account.',
                side: 'bottom',
                align: 'start',
                onNextClick: () => {
                    // select custom view
                    $('#selectView').val(VIEW_TREE).change();
                    driverObj.moveNext();
                }
            }
        },
        {
            element: '#selectView',
            popover: {
                title: 'Change the library view',
                description: 'Chose between various library views. We got artist-based, genre-based, year-based and a completely customizable view with individual folders. The custom view allows you to adjust folder and genre names.',
                side: 'bottom',
                align: 'start',
                onNextClick: () => {
                    openContextmenu();
                    driverObj.moveNext();
                }
            }
        },
        {
            element: '#contextmenu',
            popover: {
                title: 'Context menu (custom view only)',
                description: 'The custom view allows you to adjust your library via the context menu.',
                side: 'bottom',
                align: 'start',
                onNextClick: () => {
                    // close context menu
                    $('#contextmenu').css({display: 'none'});
                    driverObj.moveNext();
                }
            }
        },
        {
            element: '#selectSortAlbums',
            popover: {
                title: 'Change sorting of albums',
                description: 'Chose between year-based and name-based sorting of albums.',
                side: 'bottom',
                align: 'start',
                onPrevClick: () => {
                    openContextmenu();
                    driverObj.movePrevious();
                },
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
            element: '#buttonStartTutorial',
            popover: {
                title: 'Tutorial',
                description: 'Click here to start the tutorial again :).',
                side: 'top',
                align: 'start'
            }
        }
    ]
});