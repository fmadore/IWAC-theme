<?php
declare(strict_types=1);

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
    public function __invoke(?object $resource): string
    {
        if (!$resource) {
            return '';
        }

        $view = $this->getView();

        $resourceTags = $view->themeSetting('resource_tags');

        $tagsHtml = '';

        if (is_array($resourceTags) && (in_array('resource_type', $resourceTags, true) || in_array('resource_class', $resourceTags, true))) {

            $tagsHtml .= '<div class="resource-tags">';

            // Resource Type Tag ('Item', 'Item set', 'Media').

            if (in_array('resource_type', $resourceTags, true)) {

                $resourceName = $resource->resourceName();

                if ($resourceName) {
                    $mapResourceName = [
                        'items' => 'Item', // @translate
                        'item_sets' => 'Item set', // @translate
                        'media' => 'Media', // @translate
                    ];

                    if (array_key_exists($resourceName, $mapResourceName)) {
                        $tagLabel = $view->escapeHtml($view->translate($mapResourceName[$resourceName]));
                        $tagsHtml .= '<div class="resource-tag">' . $tagLabel . '</div>';
                    }
                }
            }

            

            // Resource Class Tag.

            if (in_array('resource_class', $resourceTags, true)) {

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
