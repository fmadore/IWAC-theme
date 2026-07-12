<?php 
namespace OmekaTheme\Helper;

use Laminas\View\Helper\AbstractHelper;

class ResourceTags extends AbstractHelper
{

    /**
     * Returns a Resource Tag HTML.
     *
     * @param object $resource The resource to add a tag to.
     * @return string
     */
    public function __invoke($resource)
    {
        if (!$resource) {
            return '';
        }

        $view = $this->getView();

        $resource_tags = $view->themeSetting('resource_tags');

        $tagsHtml = '';

        if (is_array($resource_tags) && (in_array('resource_type', $resource_tags) || in_array('resource_class', $resource_tags))) {

            $tagsHtml .= '<div class="resource-tags">';

            // Resource Type Tag ('Item', 'Item set', 'Media').

            if (in_array('resource_type', $resource_tags)) {

                $resourceName = $resource->resourceName();

                if ($resourceName) {
                    $mapResourceName = [
                        'items' => 'Item',
                        'item_sets' => 'Item set',
                        'media' => 'Media',
                    ];

                    if (array_key_exists($resourceName, $mapResourceName)) {
                        $tagLabel = $view->escapeHtml($view->translate($mapResourceName[$resourceName]));
                        $tagsHtml .= '<div class="resource-tag">' . $tagLabel . '</div>';
                    }
                }
            }

            

            // Resource Class Tag.

            if (in_array('resource_class', $resource_tags)) {

                if ($resource->resourceClass()) {
                    $tagLabel = $view->escapeHtml($view->translate($resource->displayResourceClassLabel()));
                    $tagsHtml .= '<div class="resource-tag">' . $tagLabel . '</div>';
                }
            }

            $tagsHtml .= '</div>';
        }

        return $tagsHtml;
    }
}
