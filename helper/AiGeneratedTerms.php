<?php
declare(strict_types=1);

namespace OmekaTheme\Helper;

use Laminas\View\Helper\AbstractHelper;

final class AiGeneratedTerms extends AbstractHelper
{
    private const ALWAYS_GENERATED = ['bibo:shortDescription'];

    private const GENERATED_BY_TEMPLATE = [
        21 => ['dcterms:tableOfContents'],
    ];

    /** @return list<string> */
    public function __invoke(?object $resource = null): array
    {
        $terms = self::ALWAYS_GENERATED;
        if (!$resource || !method_exists($resource, 'resourceTemplate')) {
            return $terms;
        }

        $template = $resource->resourceTemplate();
        $templateId = $template ? $template->id() : null;
        if ($templateId !== null && isset(self::GENERATED_BY_TEMPLATE[$templateId])) {
            $terms = array_merge($terms, self::GENERATED_BY_TEMPLATE[$templateId]);
        }

        return $terms;
    }
}
