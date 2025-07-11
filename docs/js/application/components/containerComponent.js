import { html } from '../utils/template-helpers.js';
import { BreadcrumbComponent } from './navigation/breadcrumbComponent.js';

// Container component functionality
export const ContainerComponent = {
    components: {
        BreadcrumbComponent
    },
    props: {
        containerId: {
            type: String,
            required: true
        },
        containerType: {
            type: String,
            default: 'default'
        },
        title: {
            type: String,
            default: ''
        },
        containerPath: {
            type: String,
            default: ''
        },
        cardStyle: {
            type: Boolean,
            default: false
        },
        showCloseButton: {
            type: Boolean,
            default: true
        },
        showHamburgerMenu: {
            type: Boolean,
            default: false
        },
        hamburgerMenuContent: {
            type: String,
            default: ''
        },
        showExpandButton: {
            type: Boolean,
            default: false
        },
        pageLocation: {
            type: String,
            default: ''
        },
        containerData: {
            type: Object,
            default: () => ({})
        },
        navigationMap: {
            type: Object,
            default: () => ({})
        }
    },
    data() {
        return {
            isLoading: false,
            content: {
                header: '',
                main: '',
                footer: ''
            },
            // Local navigation map that can be extended at runtime
            localNavigationMap: {}
        };
    },
    mounted() {
        // Container component is now ready
        // Breadcrumb navigation is handled by the BreadcrumbComponent
    },
    computed: {
        canGoBack() {
            if (!this.containerPath) return false;
            const pathSegments = this.containerPath.split('/').filter(segment => segment.length > 0);
            if (pathSegments.length <= 1) return false;
            
            // Don't allow going back if the parent path would be 'dashboard'
            const parentSegments = pathSegments.slice(0, -1);
            if (parentSegments.length === 1 && parentSegments[0] === 'dashboard') {
                return false;
            }
            
            return true;
        },
        parentPath() {
            if (!this.containerPath) return '';
            const pathSegments = this.containerPath.split('/').filter(segment => segment.length > 0);
            if (pathSegments.length <= 1) return '';
            return pathSegments.slice(0, -1).join('/');
        }
    },
    methods: {
        updateContent(section, content) {
            this.content[section] = content;
        },
        setHeaderContent(content) {
            this.content.header = content;
        },
        setMainContent(content) {
            this.content.main = content;
        },
        setFooterContent(content) {
            this.content.footer = content;
        },
        closeContainer() {
            // Emit an event to parent component to handle container removal
            this.$emit('close-container', this.containerId);
        },
        openHamburgerMenu() {
            // Check if container has custom hamburger content, otherwise use default
            const customContent = this.containerData?.customHamburgerContent || this.hamburgerMenuContent;
            
            // Emit event to parent to show modal in centralized modal-space
            this.$emit('show-hamburger-menu', {
                containerId: this.containerId,
                title: `${this.title} Menu`,
                content: customContent
            });
        },
        expandContainer() {
            // Emit event to parent to open container as a page
            this.$emit('expand-container', {
                containerId: this.containerId,
                title: this.title,
                containerType: this.containerType,
                pageLocation: this.pageLocation,
                containerPath: this.containerPath
            });
        },
        goBack() {
            if (this.canGoBack) {
                this.$emit('navigate-back', {
                    containerId: this.containerId,
                    parentPath: this.parentPath,
                    currentPath: this.containerPath
                });
            } else {
                // If no parent path, close the container
                this.closeContainer();
            }
        },
        // Handle events from breadcrumb component
        onNavigationMappingAdded(event) {
            this.$emit('navigation-mapping-added', event);
        },
        onNavigateToPath(event) {
            this.$emit('navigate-to-path', event);
        }
    },
    template: html `
        <div v-if="!isLoading" 
             class="container" 
             :class="{ 'dashboard-card': cardStyle }"
             :data-container-id="containerId" 
             :data-container-type="containerType"
             :data-container-path="containerPath">
            <div v-if="containerPath || title || showCloseButton || showHamburgerMenu || showExpandButton" class="container-header">
                <!-- Breadcrumb Navigation Component -->
                <BreadcrumbComponent
                    :container-path="containerPath"
                    :title="title"
                    :card-style="cardStyle"
                    :navigation-map="navigationMap"
                    :container-id="containerId"
                    @navigation-mapping-added="onNavigationMappingAdded"
                    @navigate-to-path="onNavigateToPath" />
                
                <div v-if="showHamburgerMenu || showExpandButton || showCloseButton || containerPath" class="header-buttons">
                    <button v-if="showHamburgerMenu" 
                            class="button-symbol gray" 
                            @click="openHamburgerMenu" 
                            title="Menu">☰</button>
                    <button v-if="showExpandButton" 
                            class="button-symbol gray" 
                            @click="expandContainer" 
                            title="Expand to page"><span class="material-symbols-outlined">expand_content</span></button>
                    <button v-if="(containerPath && canGoBack) || showCloseButton" 
                        class="button-symbol gray back-button" 
                        @click="goBack" 
                        :title="canGoBack ? 'Go back' : 'Close container'">
                        <span v-if="canGoBack" class="material-symbols-outlined">arrow_back</span>
                        <span v-else>×</span>
                    </button>
                </div>
                <div v-if="content.header" class="header-content" v-html="content.header"></div>
            </div>
            <div class="content">
                <slot name="content">
                    <div v-if="content.main" v-html="content.main"></div>
                    <div v-else>
                        <p>Container {{ containerId }} loaded successfully!</p>
                        <p>Type: {{ containerType }}</p>
                        <p>Path: {{ containerPath || 'No path' }}</p>
                    </div>
                </slot>
                <div v-if="content.footer" class="footer-content" v-html="content.footer"></div>
            </div>
        </div>
        <div v-else class="container" :class="{ 'dashboard-card': cardStyle }">
            <div class="content">
                <div class="loading-message">Loading container...</div>
            </div>
        </div>
    `
};

// Container Manager - handles multiple containers
export class ContainerManager {
    constructor() {
        this.containers = new Map();
        this.nextId = 1;
        // Shared navigation mappings across all containers
        this.globalNavigationMap = {};
    }

    createContainer(type = 'default', title = '', options = {}) {
        const containerId = options.id || `container-${this.nextId++}`;
        
        const containerData = {
            id: containerId,
            type: type,
            title: title,
            options: options,
            cardStyle: options.cardStyle || false,
            showCloseButton: options.showCloseButton !== false,
            showHamburgerMenu: options.showHamburgerMenu || false,
            hamburgerMenuContent: options.hamburgerMenuContent || '',
            showExpandButton: options.showExpandButton || false,
            pageLocation: options.pageLocation || '',
            // Pass current global navigation map to new container
            navigationMap: { ...this.globalNavigationMap, ...(options.navigationMap || {}) },
            created: new Date()
        };

        this.containers.set(containerId, containerData);
        return containerData;
    }

    /**
     * Add navigation mapping to global map and propagate to all containers
     */
    addGlobalNavigationMapping(segmentId, displayName) {
        this.globalNavigationMap[segmentId] = displayName;
        
        // Propagate to all existing containers
        this.containers.forEach(container => {
            if (container.navigationMap) {
                container.navigationMap[segmentId] = displayName;
            }
        });
    }

    removeContainer(containerId) {
        return this.containers.delete(containerId);
    }

    getContainer(containerId) {
        return this.containers.get(containerId);
    }

    getAllContainers() {
        return Array.from(this.containers.values());
    }

    clearAllContainers() {
        this.containers.clear();
        this.nextId = 1;
    }
}

// Create a global instance
export const containerManager = new ContainerManager();