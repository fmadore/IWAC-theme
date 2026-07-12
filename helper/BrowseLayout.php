<?php
namespace OmekaTheme\Helper;

use Laminas\View\Helper\AbstractHelper;

/**
 * Computes the shared grid/list layout state for browse-style listings
 * (item, item-set and media browse pages plus the browse-preview block),
 * honouring the `browse_layout` theme setting and the `?view=` query
 * parameter written by browse.js.
 */
class BrowseLayout extends AbstractHelper
{
    /**
     * @return array{setting: string, hasToggle: bool, isGrid: bool,
     *     gridState: string, listState: string, decorationClass: string}
     */
    public function __invoke()
    {
        $view = $this->getView();

        $layoutSetting = $view->themeSetting('browse_layout', 'grid');
        $isGrid = strpos($layoutSetting, 'grid') !== false;

        $viewParam = $view->params()->fromQuery('view');
        if (null !== $viewParam) {
            $isGrid = ('list' !== $viewParam);
        }

        $decoration = $view->themeSetting('image_decoration');
        $decorationClass = '';
        if (is_array($decoration) && in_array('media', $decoration)) {
            $decorationClass = $isGrid ? 'decoration' : 'decoration decoration--thumbnail';
        }

        return [
            'setting' => $layoutSetting,
            'hasToggle' => strpos($layoutSetting, 'toggle') !== false,
            'isGrid' => $isGrid,
            'gridState' => $isGrid ? 'disabled' : '',
            'listState' => $isGrid ? '' : 'disabled',
            'decorationClass' => $decorationClass,
        ];
    }
}
