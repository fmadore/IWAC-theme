<?php
/**
 * The one Laminas class the theme's view helpers extend, stubbed so the PHP
 * tests (test/php/run.php) and PHPStan (phpstan.neon.dist) need nothing but a
 * PHP binary — no Composer install, no Omeka checkout.
 */
declare(strict_types=1);

namespace Laminas\View\Helper;

if (!class_exists(AbstractHelper::class)) {
    abstract class AbstractHelper
    {
        /** @var mixed The PhpRenderer; helpers call view helpers on it dynamically. */
        protected $view;

        /**
         * @param mixed $view
         * @return $this
         */
        public function setView($view)
        {
            $this->view = $view;
            return $this;
        }

        /** @return mixed */
        public function getView()
        {
            return $this->view;
        }
    }
}
